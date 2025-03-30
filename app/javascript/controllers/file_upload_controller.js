import { Controller } from "@hotwired/stimulus";

/**
 * FileUploadController
 *
 * This Stimulus controller manages a custom file input interface.
 *
 * The native file input does not allow setting a selected filename programmatically,
 * which is a problem when re-displaying the form after a validation error.
 * This controller ensures the file name persists in such cases.
 *
 * Features:
 * - Clicking the custom button triggers the hidden file input.
 * - If a file is selected, its name is displayed; otherwise, a default message is shown.
 * - If the form is submitted with a file but fails validation, the previously selected file name is retained.
 *
 * Connects to: data-controller="file-upload"
 */
export default class extends Controller {
  // Targets are DOM elements this controller can reference
  //-------------------------------------------------------
  // DOM                                    JavaScript
  //-------------------------------------------------------
  // data-file-upload-target="input"        this.inputTarget
  // data-file-upload-target="fileNameContainer"  this.fileNameContainerTarget
  // data-file-upload-target="button"       this.buttonTarget
  static targets = ["input", "fileNameContainer", "button"];

  // Values are inputs provided from the DOM into the controller
  //------------------------------------------------------------
  // DOM                                         JavaScript
  //------------------------------------------------------------
  // data-file-upload-file-selection-text-value  this.fileSelectionTextValue
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
