import { Controller } from "@hotwired/stimulus";

// Connects to data-controller="file-upload"
export default class extends Controller {
  static targets = ["input", "fileNameContainer", "button"];
  static values = {
    fileSelectionText: { type: String, default: "No file chosen" },
  };

  connect() {
    this.buttonTarget.addEventListener("keydown", this.handleKeyDown);
    this.updateFileName();
  }

  disconnect() {
    this.buttonTarget.removeEventListener("keydown", this.handleKeyDown);
  }

  updateFileName() {
    this.fileNameContainerTarget.textContent = this.fileSelectionTextValue;
  }

  // Accessibility for keyboard users hitting Enter on custom file input button
  handleKeyDown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      this.inputTarget.click(); // Trigger hidden file input
    }
  };

  // When user selects a new file, update the display based on the native file input selection
  handleNewFileSelection() {
    if (this.inputTarget.files.length > 0) {
      this.fileNameContainerTarget.textContent = this.inputTarget.files[0].name;
    } else {
      this.updateFileName(); // Reset display if no file selected
    }
  }
}
