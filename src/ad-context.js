/**
 * Copyright 2016 The AMP HTML Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {documentInfoFor} from '../../src/document-info';
import {timer} from './timer';
import {viewportFor} from './viewport';
import {viewerFor} from './viewer';

export class AdContext {
  constructor(parentWindow, element, startTime = timer.now()) {

    /** @type {number} */
    this.startTime = startTime;

    this.tagName = element.tagName;

    const docInfo = documentInfoFor(parentWindow);
    const viewer = viewerFor(parentWindow);
    this.referrer = viewer.getUnconfirmedReferrerUrl(),
    this.canonicalUrl = docInfo.canonicalUrl,
    this.pageViewId = docInfo.pageViewId,
    this.clientId = element.getAttribute('ampcid'),
    this.location = {
      href: locationHref,
    },
    this.mode = getMode(),
    this.hidden = !viewer.isVisible(),
    this.initialIntersection = getIntersectionChangeEntry(
      timer.now(),
      viewportFor(parentWindow).getRect(),
      element.getLayoutBox()),
  }
}


export class Ad3pContext extends AdContext {
  constructor(parentWindow, element, startTime = timer.now()) {
    super(parentWindow, element, startTime);
  }
}
