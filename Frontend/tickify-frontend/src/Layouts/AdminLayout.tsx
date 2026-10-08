import Sidebar from "@/components/Sidebar";
import { Outlet } from "react-router-dom";

export default function AdminLayout() {
  return (
    <div className="flex">
      <Sidebar />
      <main 
        className="flex-1 bg-gray-50 p-6 min-h-screen transition-all duration-300"
        style={{ marginLeft: 'var(--sidebar-width, 256px)' }}
      >
        <Outlet />
      </main>
    </div>
  );
}