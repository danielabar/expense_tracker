import { Controller } from "@hotwired/stimulus";

// Connects to data-controller="file-upload"
export default class extends Controller {
  static targets = ["input", "label"];
  static values = {
    defaultText: { type: String, default: 'Choose file...' }
  }

  connect() {
    this.updateLabel();
  }

  updateLabel() {
    this.labelTarget.textContent = this.defaultTextValue
  }

  // When user selects a new file, update the label based on native file input selection
  handleNewFileSelection() {
    if (this.inputTarget.files.length > 0) {
      this.labelTarget.textContent = this.inputTarget.files[0].name;
    } else {
      this.updateLabel(); // Reset label if no file selected
    }
  }
}
