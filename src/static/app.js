document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  
  // Authentication elements
  const userIcon = document.getElementById("user-icon");
  const authDropdown = document.getElementById("auth-dropdown");
  const loginForm = document.getElementById("teacher-login");
  const userInfo = document.getElementById("user-info");
  const loggedUser = document.getElementById("logged-user");
  const logoutBtn = document.getElementById("logout-btn");
  const signupSection = document.getElementById("signup-section");
  const teacherNotice = document.getElementById("teacher-only-notice");
  
  // Auth state
  let authToken = localStorage.getItem("authToken");
  let currentUser = null;

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Create participants HTML with delete icons instead of bullet points
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span><button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button></li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons
      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    if (!authToken) {
      showMessage("Authentication required to unregister students", "error");
      return;
    }
    
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${authToken}`
          }
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to unregister. Please try again.", "error");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!authToken) {
      showMessage("Authentication required to sign up students", "error");
      return;
    }

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${authToken}`
          }
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        signupForm.reset();
        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  // Authentication functions
  async function checkAuthStatus() {
    if (!authToken) {
      updateUIForLoggedOut();
      return;
    }
    
    try {
      const response = await fetch("/auth/me", {
        headers: {
          "Authorization": `Bearer ${authToken}`
        }
      });
      
      if (response.ok) {
        currentUser = await response.json();
        updateUIForLoggedIn();
      } else {
        // Token is invalid, clear it
        localStorage.removeItem("authToken");
        authToken = null;
        currentUser = null;
        updateUIForLoggedOut();
      }
    } catch (error) {
      console.error("Error checking auth status:", error);
      updateUIForLoggedOut();
    }
  }
  
  function updateUIForLoggedIn() {
    document.getElementById("login-form").classList.add("hidden");
    userInfo.classList.remove("hidden");
    loggedUser.textContent = currentUser.username;
    signupSection.classList.remove("hidden");
    teacherNotice.classList.add("hidden");
    userIcon.style.backgroundColor = "rgba(76, 175, 80, 0.3)";
  }
  
  function updateUIForLoggedOut() {
    document.getElementById("login-form").classList.remove("hidden");
    userInfo.classList.add("hidden");
    signupSection.classList.add("hidden");
    teacherNotice.classList.remove("hidden");
    userIcon.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
    authDropdown.classList.add("hidden");
  }
  
  // Authentication event handlers
  userIcon.addEventListener("click", () => {
    authDropdown.classList.toggle("hidden");
  });
  
  // Close dropdown when clicking outside
  document.addEventListener("click", (event) => {
    if (!event.target.closest("#auth-section")) {
      authDropdown.classList.add("hidden");
    }
  });
  
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    
    const formData = new FormData();
    formData.append("username", document.getElementById("username").value);
    formData.append("password", document.getElementById("password").value);
    
    try {
      const response = await fetch("/auth/login", {
        method: "POST",
        body: formData
      });
      
      const result = await response.json();
      
      if (response.ok) {
        authToken = result.access_token;
        currentUser = result.user;
        localStorage.setItem("authToken", authToken);
        updateUIForLoggedIn();
        
        showMessage("Login successful!", "success");
        loginForm.reset();
        authDropdown.classList.add("hidden");
      } else {
        showMessage(result.detail || "Login failed", "error");
      }
    } catch (error) {
      showMessage("Login failed. Please try again.", "error");
      console.error("Login error:", error);
    }
  });
  
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("authToken");
    authToken = null;
    currentUser = null;
    updateUIForLoggedOut();
    showMessage("Logged out successfully", "success");
  });

  function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = type;
    messageDiv.classList.remove("hidden");
    
    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  // Initialize the application
  fetchActivities();
  checkAuthStatus();
});
