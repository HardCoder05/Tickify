// Este componente simula la forma de un EventCard
const EventCardSkeleton = () => (
  <div className="border border-gray-200 rounded-lg shadow-md animate-pulse">
    {/* Imagen fantasma */}
    <div className="h-48 w-full bg-gray-300 rounded-t-lg"></div>
    {/* Contenido fantasma */}
    <div className="p-5 space-y-3">
      <div className="h-6 w-3/4 bg-gray-300 rounded-lg"></div>
      <div className="h-4 w-1/2 bg-gray-300 rounded-lg"></div>
      <div className="h-4 w-1/4 bg-gray-300 rounded-lg"></div>
    </div>
  </div>
);

export default function HomePageSkeleton() {
  return (
    <div>
      {/* 1. Esqueleto del Carrusel */}
      <section className="relative w-full h-dvh md:h-80 lg:h-[560px] bg-gray-300 animate-pulse">
        {/* Aquí combinamos las 2 ideas: Loader (pulso) + Marca */}
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-500 text-3xl font-bold opacity-50">
            ⌘ Tickify
          </div>
        </div>
      </section>

      {/* 2. Esqueleto del Grid de Eventos */}
      <section className="max-w-6xl mx-auto px-6 mt-10 mb-10 md:mb-16">
        
        {/* Título fantasma */}
        <div className="h-8 w-1/3 bg-gray-300 rounded-lg mb-6 animate-pulse"></div>
        
        {/* Grid fantasma */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Creamos 4 tarjetas fantasma */}
          {[...Array(4)].map((_, index) => (
            <EventCardSkeleton key={index} />
          ))}
        </div>
      </section>
    </div>
  );
}