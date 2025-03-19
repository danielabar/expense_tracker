import { Controller } from "@hotwired/stimulus";

// Connects to data-controller="file-upload"
export default class extends Controller {
  static targets = ["input", "label", "button"];
  static values = {
    defaultText: { type: String, default: 'Choose file...' }
  }

  connect() {
    this.buttonTarget.addEventListener("keydown", this.handleKeyDown);
    this.updateLabel();
  }

  disconnect() {
    this.buttonTarget.removeEventListener("keydown", this.handleKeyDown);
  }

  updateLabel() {
    this.labelTarget.textContent = this.defaultTextValue
  }

  // Accessibility for keyboard users hitting Enter on custom file input button
  handleKeyDown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      this.inputTarget.click(); // Trigger hidden file input
    }
  };

  // When user selects a new file, update the label based on native file input selection
  handleNewFileSelection() {
    if (this.inputTarget.files.length > 0) {
      this.labelTarget.textContent = this.inputTarget.files[0].name;
    } else {
      this.updateLabel(); // Reset label if no file selected
    }
  }
}
