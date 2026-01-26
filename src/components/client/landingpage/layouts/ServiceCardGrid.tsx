interface ServiceCardGridProps {
  services: any[];
  primaryColor: string;
  isEditing?: boolean;
  onEdit?: (index: number, field: string, value: string) => void;
}

export function ServiceCardGrid({ services, primaryColor, isEditing, onEdit }: ServiceCardGridProps) {
  return (
    <section className="py-24 px-6 bg-white">
      <div className="container max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-4 tracking-tight">
            Comprehensive Local Services
          </h2>
          <div 
            className="w-24 h-2 mx-auto rounded-full" 
            style={{ backgroundColor: primaryColor }} 
          />
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <div 
              key={index}
              className="group bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-300"
            >
              {/* Card Image */}
              <div className="h-56 overflow-hidden bg-slate-100">
                {service.image_url ? (
                  <img 
                    src={service.image_url} 
                    alt={service.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full bg-slate-200 animate-pulse flex items-center justify-center">
                    <span className="text-slate-400 text-xs italic">Resolvendo imagem...</span>
                  </div>
                )}
              </div>

              <div className="p-8">
                <h3 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">
                  {service.title}
                </h3>
                <p className="text-slate-600 mb-8 leading-relaxed font-medium">
                  {service.desc}
                </p>
                
                <a 
                  href={service.cta_href || "#"}
                  className="block w-full py-4 text-center rounded-xl font-black text-lg border-2 transition-all"
                  style={{ 
                    borderColor: primaryColor,
                    color: primaryColor,
                  }}
                >
                  {service.cta_label || "Get Quote"}
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}