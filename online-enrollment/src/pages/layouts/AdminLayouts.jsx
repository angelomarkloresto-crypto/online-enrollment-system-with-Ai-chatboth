import { Outlet, NavLink, useNavigate } from "react-router-dom";

function AdminLayout(){
    const navigate = useNavigate();
    const logout = async () => {
        try {
            await fetch("http://localhost/backend-online-enrollment/admin/admin_logout.php", {
                credentials: "include",
            });
        } catch (error) {
            console.error("Logout failed:", error);
        } finally {
            localStorage.removeItem("admin_id");
            navigate("/AdminLogin");
        }
    };
    return(
        <div className="flex min-h-screen">
            <div className="w-64 bg-green-800 text-white p-5">
                <h1 className="text-2xl font-bold">Admin Panel</h1>
                <div className="flex flex-col gap-3">
                    <NavLink to="/AdminDashboard" className="p-3 rounded hover:bg-green-700">Dashboard</NavLink>
                    <NavLink to="/StaffManagement" className="p-3 rounded hover:bg-green-700">Staff Management</NavLink>
                    <NavLink to="/AdminProfile" className="p-3 rounded hover:bg-green-700">Profile</NavLink>
                    <button onClick={logout} className="bg-red-600 mt-5 p-3 rounded">Logout</button>

                </div>
            </div>
            <div className="flex-1 bg-gray-100 p-6"><Outlet/></div>


        </div>
    );
}
export default AdminLayout;