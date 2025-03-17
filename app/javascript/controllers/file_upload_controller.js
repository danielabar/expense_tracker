import { Controller } from "@hotwired/stimulus";

// FIXME: Displaying selected file name in quotes
// Connects to data-controller="file-upload"
export default class extends Controller {
  static targets = ["input", "hiddenField", "label"];

  connect() {
    this.updateLabel();
  }

  updateLabel() {
    // Check if a file is already selected (after validation error)
    if (this.hasHiddenFieldTarget && this.hiddenFieldTarget.value) {
      this.labelTarget.textContent = this.inputTarget.dataset.filename;
    } else {
      this.labelTarget.textContent = "Choose a file";
    }
  }

  handleNewFileSelection() {
    // When user selects a new file, update the label
    if (this.inputTarget.files.length > 0) {
      this.labelTarget.textContent = this.inputTarget.files[0].name;
    } else {
      this.updateLabel(); // Reset label if no file selected
    }
  }
}
