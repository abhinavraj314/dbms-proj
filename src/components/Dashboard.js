import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Trash2, Filter, Download, AlertCircle } from "lucide-react";
import EventList from "./EventList";

const userTypes = ["Student", "Faculty", "Guest"];

function Dashboard() {
  const [userType, setUserType] = useState("");
  const [name, setName] = useState("");
  const [selectedEvent, setSelectedEvent] = useState("");
  const [registeredUsers, setRegisteredUsers] = useState([]);
  const [clearLoading, setClearLoading] = useState(false);
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [filterType, setFilterType] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchRegistrations();
  }, []);

  const fetchRegistrations = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/registrations");
      if (response.ok) {
        const data = await response.json();
        setRegisteredUsers(data);
      } else {
        throw new Error("Failed to fetch registrations");
      }
    } catch (error) {
      setError(error.message);
      console.error("Error fetching registrations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredUsers = registeredUsers.filter((user) => {
    const matchesType = filterType === "all" || user.type === filterType;
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.event.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (name && userType && selectedEvent) {
      const newUser = { name, type: userType, event: selectedEvent };
      try {
        const response = await fetch("/api/registrations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newUser),
        });
        if (response.ok) {
          const addedRegistration = await response.json();
          setRegisteredUsers([...registeredUsers, addedRegistration]);
          setName("");
          setUserType("");
          setSelectedEvent("");
          setError(null);
        } else {
          throw new Error("Failed to add registration");
        }
      } catch (error) {
        setError(error.message);
        console.error("Error adding registration:", error);
      }
    }
  };

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/logout", { method: "POST" });
      if (response.ok) {
        navigate("/");
      } else {
        console.error("Logout failed");
      }
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };

  const handleClearRegistrations = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to clear all registrations? This action cannot be undone."
    );

    if (confirmed) {
      setClearLoading(true);
      try {
        const response = await fetch("/api/registrations/clear", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });

        if (response.ok) {
          setRegisteredUsers([]);
          alert("All registrations have been cleared successfully!");
        } else {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to clear registrations");
        }
      } catch (error) {
        console.error("Error clearing registrations:", error);
        alert(
          `An error occurred while clearing registrations: ${error.message}`
        );
      } finally {
        setClearLoading(false);
      }
    }
  };

  const exportToCSV = () => {
    const headers = ["Name", "Type", "Event"];
    const csvContent = [
      headers.join(","),
      ...filteredUsers.map((user) =>
        [user.name, user.type, user.event].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pesu-fest-registrations-${
      new Date().toISOString().split("T")[0]
    }.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const getRegistrationStats = () => {
    const stats = {
      total: registeredUsers.length,
      byType: {},
      byEvent: {},
    };

    registeredUsers.forEach((user) => {
      stats.byType[user.type] = (stats.byType[user.type] || 0) + 1;
      stats.byEvent[user.event] = (stats.byEvent[user.event] || 0) + 1;
    });

    return stats;
  };

  const stats = getRegistrationStats();

  const handleEventSelect = (eventName) => {
    setSelectedEvent(eventName);
    setIsEventDialogOpen(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-700 to-blue-500">
      <nav className="bg-black p-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">
            PESU Fest - DASHBOARD
          </h1>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto mt-8 p-6 space-y-6">
        {error && (
          <div className="bg-red-500 text-white p-4 rounded-lg flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <p>{error}</p>
          </div>
        )}

        <div className="bg-blue-800 rounded-lg shadow-xl border-4 border-black p-6">
          <h2 className="text-3xl font-bold mb-6 text-center text-white">
            Registration
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="name" className="block mb-1 text-white">
                  Name:
                </label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-blue-700 rounded text-white placeholder-blue-300"
                  placeholder="Enter your name"
                  required
                />
              </div>
              <div>
                <label htmlFor="userType" className="block mb-1 text-white">
                  Type:
                </label>
                <select
                  id="userType"
                  value={userType}
                  onChange={(e) => setUserType(e.target.value)}
                  className="w-full px-3 py-2 bg-blue-700 rounded text-white"
                  required
                >
                  <option value="">Select type</option>
                  {userTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block mb-1 text-white">Event:</label>
                {isEventDialogOpen ? (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
                    <div className="bg-blue-800 rounded-lg p-6 max-w-3xl max-h-[80vh] overflow-y-auto">
                      <EventList onEventSelect={handleEventSelect} />
                      <button
                        onClick={() => setIsEventDialogOpen(false)}
                        className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsEventDialogOpen(true)}
                    className="w-full px-3 py-2 bg-blue-700 rounded text-white text-left"
                  >
                    {selectedEvent || "Select event"}
                  </button>
                )}
              </div>
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded"
            >
              Register
            </button>
          </form>
        </div>

        <div className="bg-blue-800 rounded-lg shadow-xl border-4 border-black p-6">
          <div className="flex flex-wrap justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-white">
              Registration Overview
            </h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilterType("all")}
                className={`px-3 py-1 rounded ${
                  filterType === "all"
                    ? "bg-blue-500 text-white"
                    : "bg-blue-700 text-white hover:bg-blue-600"
                }`}
              >
                All ({stats.total})
              </button>
              {userTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-3 py-1 rounded ${
                    filterType === type
                      ? "bg-blue-500 text-white"
                      : "bg-blue-700 text-white hover:bg-blue-600"
                  }`}
                >
                  {type} ({stats.byType[type] || 0})
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4 flex gap-4">
            <input
              type="text"
              placeholder="Search by name or event..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-3 py-2 bg-blue-700 rounded text-white placeholder-blue-300"
            />
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 bg-blue-700 hover:bg-blue-600 text-white px-4 py-2 rounded"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          </div>

          <div className="bg-blue-700 rounded overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-blue-600">
                  <th className="px-4 py-2 text-left text-white">Name</th>
                  <th className="px-4 py-2 text-left text-white">Type</th>
                  <th className="px-4 py-2 text-left text-white">Event</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td
                      colSpan="3"
                      className="px-4 py-8 text-center text-white"
                    >
                      Loading...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td
                      colSpan="3"
                      className="px-4 py-8 text-center text-white"
                    >
                      No registrations found
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user, index) => (
                    <tr
                      key={index}
                      className={
                        index % 2 === 0 ? "bg-blue-800" : "bg-blue-700"
                      }
                    >
                      <td className="px-4 py-2 text-white">{user.name}</td>
                      <td className="px-4 py-2 text-white">{user.type}</td>
                      <td className="px-4 py-2 text-white">{user.event}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4">
            <button
              onClick={handleClearRegistrations}
              disabled={clearLoading || registeredUsers.length === 0}
              className={`flex items-center gap-2 px-4 py-2 rounded text-white ${
                registeredUsers.length === 0
                  ? "bg-gray-500 cursor-not-allowed"
                  : clearLoading
                  ? "bg-red-700 cursor-wait"
                  : "bg-red-600 hover:bg-red-700"
              }`}
            >
              <Trash2 className="h-4 w-4" />
              {clearLoading ? "Clearing..." : "Clear All"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
