Polymer({
  email: '',
  feedback: '',
  logs: '',
  close: function() {
    this.$.feedbackPanel.close();
  },
  open: function() {
    this.$.feedbackPanel.open();
  },
  sendFeedback: function() {
    this.$.sendingFeedbackDialog.open();
    core.sendFeedback({
      email: this.email,
      feedback: this.feedback,
      logs: this.$.logCheckbox.checked,
      browserInfo: navigator.userAgent,
      networkInfo: this.$.logCheckbox.checked
    }).then(() => {
      // Reset the placeholders, which seem to be cleared after the
      // user types input in the input fields.
      this.$.emailInput.placeholder = 'Email address';
      this.$.feedbackInput.placeholder = 'Write your feedback';
      // Clear the form.
      this.email = '';
      this.feedback = '';
      this.$.logCheckbox.checked = false;

      // root.ts listens for open-dialog signals and shows a popup
      // when it receives these events.
      this.fire('open-dialog', {
        heading: 'Thank you!',
        message: 'Your feedback has been submitted to the uProxy development team.',
        buttons: [{
          text: 'Done',
          signal: 'close-settings'
        }]
      });
      this.close();
      this.$.sendingFeedbackDialog.close();
    }).catch((e) => {
      this.fire('open-dialog', {
        heading: 'Email feedback instead?',
        message: 'Oops! We were unable to submit your feedback to uproxy.org. Please copy and paste your feedback in an email to info@uproxy.org.',
        buttons: [{
          text: 'OK'
        }]
      });
      this.$.sendingFeedbackDialog.close();
    });
  },
  viewLogs: function() {
    this.ui.openTab('view-logs.html');
  },
  ready: function() {
    this.ui = ui;
    this.model = model;
  }
});
