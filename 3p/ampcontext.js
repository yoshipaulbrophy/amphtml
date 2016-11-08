import './polyfills';
import {listen} from '../src/event-helper';
import {user} from '../src/log';

console.log('AMPCONTEXT.JS');

/**
 *  If window.context does not exist, we must instantiate a replacement and
 *  assign it to window.context, to provide the creative with all the required
 *  functionality.
 */
export const MessageType_ = {
  SEND_EMBED_STATE: 'send-embed-state',
  EMBED_STATE: 'embed-state',
  SEND_EMBED_CONTEXT: 'send-embed-context',
  EMBED_CONTEXT: 'embed-context',
  SEND_INTERSECTIONS: 'send-intersections',
  INTERSECTION: 'intersection',
  EMBED_SIZE: 'embed-size',
  EMBED_SIZE_CHANGED: 'embed-size-changed',
  EMBED_SIZE_DENIED: 'embed-size-denied',
};

//const windowContextCreated = new Event('windowContextCreated');

export class AmpContext {
  constructor(win) {
    /** @private {!Window} */
    this.win_ = win;
    /** Map messageType keys to callback functions for when we receive
     *  that message
     *  @private {object}
     */
    this.callbackFor_ = {};
    this.setupMetadata_();
    // Do we want to pass sentinel via hash?  or name attribute?
    const sentinelMatch = this.sentinel.match(/((\d+)-\d+)/);
    if (sentinelMatch) {
      // Sentinel has the format of "$windowDepth-$randomNumber".
      // Depth is measured from window.top.
      this.depth = Number(sentinelMatch[2]);
      this.ancestors = [];
      for (let win = this.win_; win && win != win.parent; win = win.parent) {
        // Add window keeping the top-most one at the front.
        this.ancestors.unshift(win.parent);
      }
      this.ampWindow = this.ancestors[this.depth];
    } else {
      user().error('Hash does not match amp3pSentinel format');
    }
    this.setupEventListener_();
  }

  /**
   *  Request all of the metadata attributes for context and add them to
   *  the class.
   *  @private
   */
  setupMetadata_() {
    const data = JSON.parse(decodeURI(this.win_.name));
    const context = data._context;
    this.location = context.location;
    this.canonicalUrl = context.canonicalUrl;
    this.clientId = context.clientId;
    this.pageViewId = context.pageViewId;
    this.sentinel = context.sentinel;
    this.startTime = context.startTime;
    this.referrer = context.referrer;
  }

  /**
   *
   */
  registerCallback_(messageType, callback) {
    // implicitly this causes previous callback to be dropped!
    // Should it be an array?  See what current window.context does
    this.callbackFor_[messageType] = callback;
    return () => { delete this.callbackFor_[messageType]; };
  }

  /**
   * Sets up event listener for post messages of the desired type.
   *   The actual implementation only uses a single event listener for all of
   *   the different messages, and simply diverts the message to be handled
   *   by different callbacks.
   * @private
   */
  setupEventListener_() {
    listen(this.win_, 'message', message => {
      // Does it look a message from AMP?
      if (message.source == this.ampWindow && message.data &&
          message.data.indexOf('amp-') == 0) {
        // See if we can parse the payload.
        try {
          const payload = JSON.parse(message.data.substring(4));
          // Check the sentinel as well.
          if (payload.sentinel == this.sentinel &&
              this.callbackFor_[payload.type]) {
            try {
              // We should probably report exceptions within callback
              this.callbackFor_[payload.type](payload);
            } catch (err) {
              user().error(`Error in registered callback ${payload.type}`, err);
            }
          }
        } catch (e) {
          // JSON parsing failed. Ignore the message.
        }
      }
    });
  };
};

/**
 *  Send message to runtime to start sending page visibility messages.
 *  @param {function} callback Function to call every time we receive a
 *    page visibility message.
 *  @returns {function} that when called stops triggering the callback
 *    every time we receive a page visibility message.
 */
AmpContext.prototype.observePageVisibility = function(callback) {
  const stopObserveFunc = this.registerCallback_(MessageType_.EMBED_STATE,
						 callback);
  this.ampWindow.postMessage({
    sentinel: this.sentinel,
    type: MessageType_.SEND_EMBED_STATE,
  }, '*');

  return stopObserveFunc;
};

/**
 *  Send message to runtime to start sending intersection messages.
 *  @param {function} callback Function to call every time we receive an
 *    intersection message.
 *  @returns {function} that when called stops triggering the callback
 *    every time we receive an intersection message.

 */
AmpContext.prototype.observeIntersection = function(callback) {
  const stopObserveFunc = this.registerCallback_(MessageType_.INTERSECTION,
						 callback);
  this.ampWindow.postMessage({
    sentinel: this.sentinel,
    type: MessageType_.SEND_INTERSECTIONS,
  }, '*');

  return stopObserveFunc;
};

/**
 *  Send message to runtime requesting to resize ad to height and width.
 *    This is not guaranteed to succeed. All this does is make the request.
 *  @param {int} height The new height for the ad we are requesting.
 *  @param {int} width The new width for the ad we are requesting.
 */
AmpContext.prototype.requestResize = function(height, width) {
  this.ampWindow.postMessage({
    sentinel: this.sentinel,
    type: MessageType_.EMBED_SIZE,
    width,
    height,
  }, '*');
};

/**
 *  Allows a creative to set the callback function for when the resize
 *    request returns a success. The callback should be set before resizeAd
 *    is ever called.
 *  @param {function(requestedHeight, requestedWidth)} callback Function
 *    to call if the resize request succeeds.
 */
AmpContext.prototype.onResizeSuccess = function(callback) {
  this.registerCallback_(MessageType_.EMBED_SIZE_CHANGED, function(obj) {
    callback(obj.requestedHeight, obj.requestedWidth); });
};

/**
 *  Allows a creative to set the callback function for when the resize
 *    request is denied. The callback should be set before resizeAd
 *    is ever called.
 *  @param {function(requestedHeight, requestedWidth)} callback Function
 *    to call if the resize request is denied.
 */
AmpContext.prototype.onResizeDenied = function(callback) {
  this.registerCallback_(MessageType_.EMBED_SIZE_DENIED, function(obj) {
    callback(obj.requestedHeight, obj.requestedWidth); });
};
