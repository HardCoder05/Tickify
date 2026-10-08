import { useEffect, useState } from "react";
import { getEventos } from "@/events/services/EventService";
import type { Evento } from "@/events/types/event";
import EventCard from "@/events/components/EventCard";
import { Carousel, type CarouselTheme } from "flowbite-react";
import HomePageSkeleton from "../components/HomePageSkeleton";

const customTheme: Partial<CarouselTheme> = {
  root: {
    base: "relative h-full w-full rounded-none",
    leftControl: "absolute left-0 top-0 flex h-full items-center justify-center px-4 focus:outline-none",
    rightControl: "absolute right-0 top-0 flex h-full items-center justify-center px-4 focus:outline-none",
  },
  control: {
    base: "inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/30 group-hover:bg-blue-600 group-focus:outline-none group-focus:ring-4 group-focus:ring-white sm:h-10 sm:w-10",
    icon: "h-5 w-5 text-white sm:h-6 sm:w-6",
  },
  scrollContainer: {
    base: "flex h-full snap-mandatory overflow-y-hidden overflow-x-scroll scroll-smooth rounded-none",
    snap: "snap-center",
  },
};

export default function HomePage() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getEventos()
      .then(setEventos)
      .catch(console.error)
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  if (isLoading) {
    return <HomePageSkeleton />;
  }

  if (eventos.length === 0) {
    return <div className="text-center p-10">No hay eventos disponibles por el momento.</div>;
  }

  const carouselEventos = eventos.slice(0, 5);
  const gridPopular = eventos.slice(1, 5);
  const gridProximos = eventos.slice(5, 9);

  return (
    <div>
      <section className="relative w-full h-dvh md:h-80 lg:h-[560px]">
        <Carousel theme={customTheme}>
          {
            carouselEventos.map((ev) => (
              <div key={ev.id} className="relative w-full h-full">
                <img
                  src={ev.banner_url}
                  className="absolute block w-full h-full object-cover object-center"
                  alt={ev.nombre}
                />
                <div
                  className="absolute bottom-0 left-0 right-0 bg-black/40 bg-opacity-50 text-white p-4 md:p-8"
                >
                  <h3 className="text-2xl md:text-4xl font-bold">{ev.nombre}</h3>
                  <p className="mt-2 text-sm md:text-base line-clamp-2">{ev.descripcion}</p>
                </div>
              </div>
            ))
          }
        </Carousel>
      </section>

      {/* Grid de eventos */}
      <section className="max-w-6xl mx-auto px-6 mt-10">
        <h2 className="text-2xl font-bold mb-6">Eventos populares</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {gridPopular.map((ev) => (
            <EventCard key={ev.id} {...ev} />
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 mt-10 mb-10 md:mb-16">
        <h2 className="text-2xl font-bold mb-6">Próximos eventos</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {gridProximos.map((ev) => (
            <EventCard key={ev.id} {...ev} />
          ))}
        </div>
      </section>
    </div>
  );
}