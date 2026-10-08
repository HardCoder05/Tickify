interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
}) => {
  // 🔹 Función para generar el rango de páginas con "..."
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5; // máximo botones visibles

    if (totalPages <= maxVisible) {
      // Caso simple: pocas páginas
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Siempre mostrar primera y última
      pages.push(1);

      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);

      if (start > 2) pages.push("...");
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      if (end < totalPages - 1) pages.push("...");

      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div className="flex justify-center items-center mt-4 space-x-2">
      {/* Botón Anterior */}
      <button
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
        className="disabled:opacity-50 hover:bg-gray-400"
      >
        Anterior
      </button>

      {/* Botones de páginas */}
      {getPageNumbers().map((page, index) =>
        page === "..." ? (
          <span key={index} className="px-3 py-1">
            ...
          </span>
        ) : (
          <button
            key={index}
            onClick={() => onPageChange(page as number)}
            className={`px-3 py-1 rounded ${
              currentPage === page
                ? "text-black border-[#E4E4E7] border-2"
                : "bg-gray-300 hover:bg-gray-400"
            }`}
          >
            {page}
          </button>
        )
      )}

      {/* Botón Siguiente */}
      <button
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        className="disabled:opacity-50 hover:bg-gray-400"
      >
        Siguiente
      </button>
    </div>
  );
};

export default Pagination;
