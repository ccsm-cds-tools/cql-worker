export class MessageListener {
  constructor() {
    // Internal array to store all message objects
    this.messages = [];
  }

  /**
   * cql-execution Message Listener implementation
   * @param {Any} source - Source object returned unmodified by the Message operation
   * @param {String} code - Token that is the coded representation of the error
   * @param {String} severity - Token Trace | Message | Warning | Error
   * @param {String} message - content of the actual message that is sent to the calling environment
   * @returns {}
   */
  onMessage(source, code, severity, message) {
    // Add the message object to the internal array
    this.messages.push({
      source: JSON.stringify(source),
      code: code,
      severity: severity,
      message: message
    });
  }
}
