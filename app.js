const navLinks = document.querySelectorAll(".nav-link");
const viewPanels = document.querySelectorAll("[data-view-panel]");
const jumpButtons = document.querySelectorAll("[data-view-jump]");

const attendanceForm = document.getElementById("attendanceForm");
const leaveForm = document.getElementById("leaveForm");
const timesheetForm = document.getElementById("timesheetForm");
const geofenceForm = document.getElementById("geofenceForm");

const captureLocationBtn = document.getElementById("captureLocationBtn");
const locationStatus = document.getElementById("locationStatus");
const geofenceSummary = document.getElementById("geofenceSummary");
const settingsStatus = document.getElementById("settingsStatus");

const officeLatitudeInput = document.getElementById("officeLatitude");
const officeLongitudeInput = document.getElementById("officeLongitude");
const allowedRadiusInput = document.getElementById("allowedRadius");
const officeLabelInput = document.getElementById("officeLabel");
const policyNoteInput = document.getElementById("policyNote");

const defaultGeofence = {
  officeLatitude: "",
  officeLongitude: "",
  allowedRadius: 150,
  officeLabel: "",
  policyNote: "Attendance is allowed only within the approved office radius."
};

let attendanceState = {
  locationCaptured: false,
  validWithinZone: false,
  currentDistance: null,
  latitude: null,
  longitude: null,
  accuracy: null
};

function activateView(viewName) {
  navLinks.forEach((button) => {
    button.classList.toggle("active", button.dataset.view === viewName);
  });

  viewPanels.forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.viewPanel === viewName);
  });
}

function setLocationMessage(message, isError = false) {
  locationStatus.textContent = message;
  locationStatus.style.background = isError ? "#fff2f2" : "#eef7f3";
  locationStatus.style.color = isError ? "#b84848" : "#085540";
}

function setSettingsMessage(message, isError = false) {
  settingsStatus.textContent = message;
  settingsStatus.style.background = isError ? "#fff2f2" : "#eef7f3";
  settingsStatus.style.color = isError ? "#b84848" : "#085540";
}

function getGeofenceConfig() {
  const savedConfig = localStorage.getItem("peopleflow-geofence");

  if (!savedConfig) {
    return { ...defaultGeofence };
  }

  try {
    return { ...defaultGeofence, ...JSON.parse(savedConfig) };
  } catch (error) {
    return { ...defaultGeofence };
  }
}

function saveGeofenceConfig(config) {
  localStorage.setItem("peopleflow-geofence", JSON.stringify(config));
}

function loadGeofenceIntoForm() {
  const config = getGeofenceConfig();
  officeLatitudeInput.value = config.officeLatitude;
  officeLongitudeInput.value = config.officeLongitude;
  allowedRadiusInput.value = config.allowedRadius;
  officeLabelInput.value = config.officeLabel;
  policyNoteInput.value = config.policyNote;
  refreshGeofenceSummary();
}

function refreshGeofenceSummary() {
  const config = getGeofenceConfig();

  if (!config.officeLatitude || !config.officeLongitude || !config.officeLabel) {
    geofenceSummary.textContent = "Allowed location not configured yet. Add the official office latitude, longitude, and radius in Settings.";
    return;
  }

  geofenceSummary.textContent = `${config.officeLabel}: ${Number(config.officeLatitude).toFixed(6)}, ${Number(config.officeLongitude).toFixed(6)} | Allowed radius: ${config.allowedRadius} meters. ${config.policyNote}`;
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function calculateDistanceInMeters(lat1, lon1, lat2, lon2) {
  const earthRadius = 6371000;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadius * c;
}

function resetAttendanceValidation() {
  attendanceState = {
    locationCaptured: false,
    validWithinZone: false,
    currentDistance: null,
    latitude: null,
    longitude: null,
    accuracy: null
  };
}

function validateCapturedLocation(latitude, longitude, accuracy) {
  const config = getGeofenceConfig();

  if (!config.officeLatitude || !config.officeLongitude || !config.officeLabel) {
    resetAttendanceValidation();
    setLocationMessage("Attendance rule is not configured yet. Save the official office location in Settings first.", true);
    activateView("settings");
    return;
  }

  const officeLatitude = Number(config.officeLatitude);
  const officeLongitude = Number(config.officeLongitude);
  const allowedRadius = Number(config.allowedRadius);
  const distance = calculateDistanceInMeters(latitude, longitude, officeLatitude, officeLongitude);
  const insideZone = distance <= allowedRadius;

  attendanceState = {
    locationCaptured: true,
    validWithinZone: insideZone,
    currentDistance: distance,
    latitude,
    longitude,
    accuracy
  };

  if (!insideZone) {
    setLocationMessage(
      `Location captured, but attendance is blocked. You are ${Math.round(distance)} meters away from ${config.officeLabel}. Allowed radius is ${allowedRadius} meters.`,
      true
    );
    return;
  }

  setLocationMessage(
    `Location verified for attendance. You are ${Math.round(distance)} meters from ${config.officeLabel}. Accuracy: ${Math.round(accuracy)} meters.`,
    false
  );
}

navLinks.forEach((button) => {
  button.addEventListener("click", () => {
    activateView(button.dataset.view);
  });
});

jumpButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activateView(button.dataset.viewJump);
  });
});

if (geofenceForm) {
  geofenceForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const radius = Number(allowedRadiusInput.value);

    if (radius < 150 || radius > 200) {
      setSettingsMessage("Radius must stay between 150 and 200 meters.", true);
      return;
    }

    const config = {
      officeLatitude: officeLatitudeInput.value.trim(),
      officeLongitude: officeLongitudeInput.value.trim(),
      allowedRadius: radius,
      officeLabel: officeLabelInput.value.trim(),
      policyNote: policyNoteInput.value.trim() || defaultGeofence.policyNote
    };

    saveGeofenceConfig(config);
    resetAttendanceValidation();
    refreshGeofenceSummary();
    setLocationMessage("Location not captured yet. Capture a fresh location before marking attendance.");
    setSettingsMessage("Attendance location rule saved. Attendance will only be allowed inside this configured radius.");
    activateView("attendance");
  });
}

if (captureLocationBtn) {
  captureLocationBtn.addEventListener("click", () => {
    if (!navigator.geolocation) {
      setLocationMessage("Geolocation is not supported in this browser.", true);
      return;
    }

    setLocationMessage("Capturing current location...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        validateCapturedLocation(latitude, longitude, accuracy);
      },
      (error) => {
        resetAttendanceValidation();
        setLocationMessage(`Unable to capture location: ${error.message}`, true);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  });
}

if (attendanceForm) {
  attendanceForm.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!attendanceState.locationCaptured) {
      setLocationMessage("Attendance cannot be marked until the employee's live location is captured.", true);
      return;
    }

    if (!attendanceState.validWithinZone) {
      setLocationMessage("Attendance cannot be marked because the employee is outside the allowed office radius.", true);
      return;
    }

    const employeeId = document.getElementById("employeeId").value.trim();
    const shift = document.getElementById("shift").value;

    alert(
      `Attendance marked for ${employeeId} on ${shift} shift.\nVerified distance: ${Math.round(attendanceState.currentDistance)} meters.\nNext step: connect this form to a backend and database.`
    );

    attendanceForm.reset();
    resetAttendanceValidation();
    setLocationMessage("Attendance saved in demo mode. Capture a fresh location for the next attendance entry.");
  });
}

if (leaveForm) {
  leaveForm.addEventListener("submit", (event) => {
    event.preventDefault();
    alert("Leave request submitted in demo mode. Next step is backend integration with approval routing.");
    leaveForm.reset();
  });
}

if (timesheetForm) {
  timesheetForm.addEventListener("submit", (event) => {
    event.preventDefault();
    alert("Timesheet submitted in demo mode. Next step is storing project-hour data in a backend.");
    timesheetForm.reset();
  });
}

loadGeofenceIntoForm();
activateView("dashboard");
