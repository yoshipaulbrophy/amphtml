/* Copyright 2016 The AMP HTML Authors. All Rights Reserved.
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

import {AmpA4A} from '../../amp-a4a/0.1/amp-a4a';
import {isDoubleclickA4AValidEnvironment} from './doubleclick-a4a-config';

const AMP_SIGNATURE_HEADER = 'X-AmpAdSignature';

export class AmpAdNetworkDoubleclickImpl extends AmpA4A {
   constructor(element) {
     super(element);
   }

   /** @override */
   isValidElement() {
     return isDoubleclickA4AValidEnvironment(this.getWin()) &&
      !!this.element.parentElement &&
       this.element.parentElement.tagName == 'AMP-AD' &&
       !!this.element.getAttribute('data-ad-client');
   }

   /** @override */
   getAdUrl() {
     return Promise.resolve('');
   }

   /** @override */
   extractCreativeAndSignature(responseText, responseHeaders) {
     const adResponse = {
       creativeArrayBuffer: responseText,
       signature: null,
     };
     try {
       adResponse['signature'] = responseHeaders.get(AMP_SIGNATURE_HEADER);
     } finally {
       return Promise.resolve(adResponse);
     }
   }
 }

AMP.registerElement(
  'amp-ad-network-doubleclick-impl', AmpAdNetworkDoubleclickImpl);
