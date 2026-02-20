

# Engine V1 Hotfix — Anti-Zombie + blogId Fix + Heartbeat + Watchdog

## Root Cause Analysis

The latest job `a6dd9c3a` completed ALL steps (INPUT through META_GEN) successfully, then crashed at OUTPUT with **`blogId is not defined`** — a simple JavaScript reference error. The variable `blogId` on line 1289 of `orchestrate-generation/index.ts` was never declared. It should be `(jobInput.blog_id as string)`.

Additionally, the orchestrator has structural reliability gaps: no heartbeat loop, no progress watchdog, `safeInsert` uses `.select().single()` (deadlock risk), and lock refresh logic inside `safeInsert` adds contention.

---

## Changes

### Fix 1 — blogId Reference Error (THE BLOCKER)

**File:** `supabase/functions/orchestrate-generation/index.ts` (line 1289)

Replace the undeclared `blogId` with `(jobInput.blog_id as string)` in the `executeOutput` function's insert payload. Add a guard at the top of `executeOutput` to extract and validate `blogId` before proceeding.

### Fix 2 — Heartbeat Loop

**File:** `supabase/functions/orchestrate-generation/index.ts`

After acquiring the lock (around line 1447), start a `setInterval` every 10 seconds that updates `generation_jobs.locked_at` and `public_message`. Clear it in both the success path and the catch/finally block.

### Fix 3 — Progress Watchdog

**File:** `supabase/functions/orchestrate-generation/index.ts`

Track `lastProgressAt = Date.now()` and update it after each step completes. Add a `setInterval` (every 15s) that checks if 90 seconds pass without progress. If triggered, mark the job as `failed` with `ENGINE_STUCK_NO_PROGRESS_90S`, release the lock, and stop execution.

### Fix 4 — safeInsert Hardening

**File:** `supabase/functions/orchestrate-generation/index.ts` (lines 238-271)

- Change `.select().single()` to `.select('id').maybeSingle()` to prevent blocking on no-row-return
- Remove the lock refresh logic (lines 265-268) from inside `safeInsert` — the heartbeat loop handles lock refresh now

### Fix 5 — try/catch/finally Finalizer

**File:** `supabase/functions/orchestrate-generation/index.ts`

Wrap the pipeline in `try/catch/finally`. In `finally`: if job status is not `completed`, release the lock. Clear heartbeat and watchdog intervals.

### Fix 6 — create-generation-job Start Verification

**File:** `supabase/functions/create-generation-job/index.ts`

After firing the orchestrator, poll `generation_steps` for `INPUT_VALIDATION` every 1 second for up to 10 seconds. If it never appears, mark the job as `failed` with `ENGINE_NOT_STARTED` and return an error to the frontend.

### Fix 7 — Deploy and Clean

- Redeploy `orchestrate-generation` and `create-generation-job`
- Cancel any stuck running jobs via SQL

---

## Technical Details

### blogId fix (line 1289)
```
// BEFORE (broken):
blog_id: blogId,

// AFTER:
blog_id: (jobInput.blog_id as string),
```

With guard at top of executeOutput:
```typescript
const blogId = (jobInput.blog_id as string);
if (!blogId) throw new Error('blog_id missing from jobInput');
```

### Heartbeat (after lock acquired, ~line 1447)
```typescript
let heartbeatRunning = true;
const heartbeatInterval = setInterval(async () => {
  if (!heartbeatRunning) { clearInterval(heartbeatInterval); return; }
  await supabase.from('generation_jobs')
    .update({ locked_at: new Date().toISOString() })
    .eq('id', jobId).eq('locked_by', lockId);
}, 10_000);
```

### Progress Watchdog (after lock acquired)
```typescript
let lastProgressAt = Date.now();
const watchdogInterval = setInterval(async () => {
  if (Date.now() - lastProgressAt > 90_000) {
    await supabase.from('generation_jobs').update({
      status: 'failed',
      error_message: 'ENGINE_STUCK_NO_PROGRESS_90S',
      public_message: 'O gerador travou. Tente novamente.',
      locked_by: null, locked_at: null,
      completed_at: new Date().toISOString(),
    }).eq('id', jobId);
    heartbeatRunning = false;
    clearInterval(watchdogInterval);
    clearInterval(heartbeatInterval);
  }
}, 15_000);
```

Update `lastProgressAt = Date.now()` after each step completion (in both parallel and sequential phases).

### safeInsert fix
```typescript
// BEFORE:
.select().single();

// AFTER:
.select('id').maybeSingle();
```

Remove lines 265-268 (lock refresh inside safeInsert).

### Finally block
```typescript
} catch (error) {
  // existing error handling...
} finally {
  heartbeatRunning = false;
  clearInterval(heartbeatInterval);
  clearInterval(watchdogInterval);
  // Release lock if not already released
  await supabase.from('generation_jobs')
    .update({ locked_by: null, locked_at: null })
    .eq('id', jobId).eq('locked_by', lockId);
}
```

### create-generation-job start verification
```typescript
// After orchestrator wake, replace current sleep(3000) check with:
let engineStarted = false;
for (let i = 0; i < 10; i++) {
  const { data } = await supabase
    .from('generation_steps')
    .select('id')
    .eq('job_id', job.id)
    .eq('step_name', 'INPUT_VALIDATION')
    .maybeSingle();
  if (data) { engineStarted = true; break; }
  await sleep(1000);
}
if (!engineStarted) {
  await supabase.from('generation_jobs').update({
    status: 'failed',
    error_message: 'ENGINE_NOT_STARTED',
    public_message: 'O motor nao iniciou. Tente novamente.',
  }).eq('id', job.id);
}
```

---

## Files Modified

| File | Change |
|------|--------|
| `supabase/functions/orchestrate-generation/index.ts` | blogId fix, heartbeat, watchdog, safeInsert, finalizer |
| `supabase/functions/create-generation-job/index.ts` | Start verification polling |

## What Does NOT Change

- No frontend changes
- No architecture changes
- No new features
- No model changes

