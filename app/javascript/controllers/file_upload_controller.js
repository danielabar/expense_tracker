import { Controller } from "@hotwired/stimulus";

// TODO: Remove hidden field, just need defaultTextValue
// Connects to data-controller="file-upload"
export default class extends Controller {
  static targets = ["input", "hiddenField", "label"];
  static values = {
    defaultText: { type: String, default: 'Choose file...' }
  }

  connect() {
    console.log("=== connect ===");
    this.updateLabel();
  }

  updateLabel() {
    console.log(`=== updateLabel: ${this.defaultTextValue} ===`);
    this.labelTarget.textContent = this.defaultTextValue
  }

  handleNewFileSelection() {
    // temp debug
    console.log("=== handleNewFileSelection ===");
    // When user selects a new file, update the label
    if (this.inputTarget.files.length > 0) {
      console.log(`=== handleNewFileSelection: native file selection: ${this.inputTarget.files[0].name} ===`);
      this.labelTarget.textContent = this.inputTarget.files[0].name;
    } else {
      console.log(`=== handleNewFileSelection: no file selected, delegating to updateLabel ===`);
      this.updateLabel(); // Reset label if no file selected
    }
  }
}
