import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Trash2, Download, AlertCircle } from "lucide-react";
import EventList from "./EventList";

function Dashboard() {
  const [eventId, setEventId] = useState(null);
  const [teamName, setTeamName] = useState(""); // Changed from teamId to teamName to match backend
  const [registeredEvents, setRegisteredEvents] = useState([]);
  const [clearLoading, setClearLoading] = useState(false);
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [teamMembers, setTeamMembers] = useState(["", ""]); // These will be student IDs
  const [teamMemberErrors, setTeamMemberErrors] = useState(["", ""]);
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
        setRegisteredEvents(data);
        console.log(data);
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

  function formatDate(dateStr, timeStr) {
    if (!dateStr) return "";
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return "";
      return `${date.toLocaleDateString()} ${timeStr || ""}`.trim();
    } catch (error) {
      console.error("Error formatting date:", error);
      return "";
    }
  }

  const filteredEvents = registeredEvents.filter((event) => {
    const eventName = Array.isArray(event.eventName)
      ? event.eventName[0]
      : typeof event.eventName === "string"
      ? event.eventName
      : "";
    return eventName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleTeamMemberChange = (index, value) => {
    const newTeamMembers = [...teamMembers];
    newTeamMembers[index] = value;
    setTeamMembers(newTeamMembers);

    const newErrors = [...teamMemberErrors];
    newErrors[index] = "";
    setTeamMemberErrors(newErrors);
  };

  const handleTeamNameChange = (e) => {
    const value = e.target.value;
    setTeamName(value);
  };

  const validateTeamMembers = () => {
    const newErrors = teamMembers.map((member) =>
      !member ? "Student ID is required" : ""
    );
    setTeamMemberErrors(newErrors);
    return !newErrors.some((error) => error);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!eventId || !teamName) {
      setError("Please select an event and provide a team name");
      return;
    }

    if (!validateTeamMembers()) {
      setError("Please fill in all team member IDs");
      return;
    }

    try {
      console.log("Submitting registration with:", {
        eventId,
        teamName,
        teamMembers: teamMembers.filter((id) => id.trim() !== ""),
      });

      const response = await fetch("/api/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          teamName,
          teamMembers: teamMembers.filter((id) => id.trim() !== ""),
        }),
        credentials: "include", // Add this to ensure cookies are sent
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to register for event");
      }

      const addedRegistration = await response.json();
      console.log("Registration successful:", addedRegistration);
      setRegisteredEvents((prev) => [...prev, addedRegistration]);
      setEventId(null);
      setTeamName("");
      setTeamMembers(["", ""]);
      setError(null);
      alert(
        "Team registration successful! Confirmation emails have been sent."
      );

      // Refresh the registrations list
      fetchRegistrations();
    } catch (error) {
      setError(error.message);
      console.error("Error adding registration:", error);
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
      "Are you sure you want to clear all your registrations? This action cannot be undone."
    );

    if (confirmed) {
      setClearLoading(true);
      try {
        const response = await fetch("/api/registrations/clear", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });

        if (response.ok) {
          setRegisteredEvents([]);
          alert("All your registrations have been cleared successfully!");
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
    const headers = [
      "Event Name",
      "Date",
      "Time",
      "Venue",
      "Team ID",
      "Team Members",
    ];
    const csvContent = [
      headers.join(","),
      ...filteredEvents.map((event) =>
        [
          event.eventName,
          new Date(event.eventDate).toLocaleDateString(),
          event.eventTime,
          event.venue,
          event.teamId,
          event.teamMembers.map((member) => member.studentId).join("; "),
        ].join(",")
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

  const handleEventSelect = (selectedEventId) => {
    setEventId(selectedEventId);
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
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-2">Welcome!</h1>
          <p className="text-blue-100">Select an event below to register</p>
        </div>

        {error && (
          <div className="bg-red-500 text-white p-4 rounded-lg flex items-center gap-2 max-w-xl mx-auto">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        <div className="bg-blue-800 rounded-lg shadow-xl border-4 border-black p-6 max-w-xl mx-auto">
          <h2 className="text-3xl font-bold mb-6 text-center text-white">
            Team Registration
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col items-center">
              <label className="block mb-2 text-lg text-white">
                Select Event:
              </label>
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
                  className="w-full max-w-md px-6 py-3 bg-blue-700 rounded-lg text-white text-center hover:bg-blue-600 transition-colors"
                >
                  {eventId ? "Selected Event" : "Click to Select Event"}
                </button>
              )}
            </div>
            <div className="space-y-1">
              <label className="block text-lg text-white">Team Name:</label>
              <input
                type="text"
                value={teamName}
                onChange={handleTeamNameChange}
                placeholder="Enter team name"
                className="w-full px-3 py-2 bg-white border border-blue-300 rounded-md"
                required
              />
            </div>
            <div className="space-y-4">
              <label className="block text-lg text-white">
                Team Members (Student IDs):
              </label>
              {teamMembers.map((member, index) => (
                <div key={index} className="space-y-1">
                  <input
                    type="text"
                    value={member}
                    onChange={(e) =>
                      handleTeamMemberChange(index, e.target.value)
                    }
                    placeholder={`Team Member ${index + 1} Student ID`}
                    className="w-full px-3 py-2 bg-white border border-blue-300 rounded-md"
                  />
                  {teamMemberErrors[index] && (
                    <p className="text-red-400 text-sm">
                      {teamMemberErrors[index]}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <button
              type="submit"
              disabled={!eventId || !teamName}
              className="w-full max-w-md mx-auto block bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Register Team for Event
            </button>
          </form>
        </div>

        <div className="bg-blue-800 rounded-lg shadow-xl border-4 border-black p-6">
          <div className="flex flex-wrap justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-white">Your Registrations</h3>
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 bg-blue-700 hover:bg-blue-600 text-white px-4 py-2 rounded"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          </div>

          <div className="mb-4">
            <input
              type="text"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 bg-blue-700 rounded text-white placeholder-blue-300"
            />
          </div>

          <div className="bg-blue-700 rounded overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-blue-600">
                  <th className="px-4 py-2 text-left text-white">Event Name</th>
                  <th className="px-4 py-2 text-left text-white">
                    Date & Time
                  </th>
                  <th className="px-4 py-2 text-left text-white">Venue</th>
                  <th className="px-4 py-2 text-left text-white">Team ID</th>
                  <th className="px-4 py-2 text-left text-white">
                    Team Members
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td
                      colSpan="5"
                      className="px-4 py-8 text-center text-white"
                    >
                      Loading...
                    </td>
                  </tr>
                ) : filteredEvents.length === 0 ? (
                  <tr>
                    <td
                      colSpan="5"
                      className="px-4 py-8 text-center text-white"
                    >
                      No registrations found
                    </td>
                  </tr>
                ) : (
                  filteredEvents.map((event, index) => {
                    const eventName = Array.isArray(event.eventName)
                      ? event.eventName[0]
                      : event.eventName;

                    const dateTimeStr =
                      event.eventDate && event.eventTime
                        ? `${event.eventDate} ${event.eventTime}`
                        : "Date not available";
                    const teamMembersStr =
                      event.teamMembers && event.teamMembers.length > 0
                        ? event.teamMembers
                            .filter((member) => member.studentId)
                            .map((member) => member.studentId)
                            .join(", ")
                        : "No team members";

                    return (
                      <tr
                        key={index}
                        className={
                          index % 2 === 0 ? "bg-blue-800" : "bg-blue-700"
                        }
                      >
                        <td className="px-4 py-2 text-white">{eventName}</td>
                        <td className="px-4 py-2 text-white">{dateTimeStr}</td>
                        <td className="px-4 py-2 text-white">
                          {event.venue || "Venue not specified"}
                        </td>
                        <td className="px-4 py-2 text-white">
                          {teamMembersStr}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4">
            <button
              onClick={handleClearRegistrations}
              disabled={clearLoading || registeredEvents.length === 0}
              className={`flex items-center gap-2 px-4 py-2 rounded text-white ${
                registeredEvents.length === 0
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
