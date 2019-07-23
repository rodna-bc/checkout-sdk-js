module.exports=function(t){var e={};function n(r){if(e[r])return e[r].exports;var i=e[r]={i:r,l:!1,exports:{}};return t[r].call(i.exports,i,i.exports,n),i.l=!0,i.exports}return n.m=t,n.c=e,n.d=function(t,e,r){n.o(t,e)||Object.defineProperty(t,e,{enumerable:!0,get:r})},n.r=function(t){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(t,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(t,"__esModule",{value:!0})},n.t=function(t,e){if(1&e&&(t=n(t)),8&e)return t;if(4&e&&"object"==typeof t&&t&&t.__esModule)return t;var r=Object.create(null);if(n.r(r),Object.defineProperty(r,"default",{enumerable:!0,value:t}),2&e&&"string"!=typeof t)for(var i in t)n.d(r,i,function(e){return t[e]}.bind(null,i));return r},n.n=function(t){var e=t&&t.__esModule?function(){return t.default}:function(){return t};return n.d(e,"a",e),e},n.o=function(t,e){return Object.prototype.hasOwnProperty.call(t,e)},n.p="",n(n.s=138)}({0:function(t,e){t.exports=require("tslib")},103:function(t,e,n){"use strict";var r,i=n(31),o=n(52),s=n.n(o),a=function(){function t(t){this._namespace=t}return t.prototype.getItem=function(t){var e=s.a.getItem(this.withNamespace(t));if(null===e)return null;try{return JSON.parse(e)}catch(e){return this.removeItem(this.withNamespace(t)),null}},t.prototype.getItemOnce=function(t){var e=this.getItem(t);return this.removeItem(t),e},t.prototype.setItem=function(t,e){return s.a.setItem(this.withNamespace(t),JSON.stringify(e))},t.prototype.removeItem=function(t){return s.a.removeItem(this.withNamespace(t))},t.prototype.withNamespace=function(t){return this._namespace+"."+t},t}(),c=n(80),u=n(0),d=n(69),l=n(23),h=function(t){function e(e){var n=t.call(this,e,{message:e.body.title})||this;return n.name="InvalidLoginTokenError",n.type="invalid_login_token",n}return u.__extends(e,t),e}(n(26).a),p=n(11);!function(t){t.MissingContainer="missing_container",t.MissingContent="missing_content",t.UnknownError="unknown_error"}(r||(r={}));var f=function(t){function e(e,n){void 0===n&&(n=r.UnknownError);var i=t.call(this,e||"Unable to embed the checkout form.")||this;return i.subtype=n,i.name="NotEmbeddableError",i.type="not_embeddable",i}return u.__extends(e,t),e}(p.a),m=n(61),_=function(){function t(t,e,n,r,i,o,s,a){var c=this;this._iframeCreator=t,this._messageListener=e,this._messagePoster=n,this._loadingIndicator=r,this._requestSender=i,this._storage=o,this._location=s,this._options=a,this._isAttached=!1,this._options.onComplete&&this._messageListener.addListener(l.a.CheckoutComplete,this._options.onComplete),this._options.onError&&this._messageListener.addListener(l.a.CheckoutError,this._options.onError),this._options.onLoad&&this._messageListener.addListener(l.a.CheckoutLoaded,this._options.onLoad),this._options.onFrameLoad&&this._messageListener.addListener(l.a.FrameLoaded,this._options.onFrameLoad),this._options.onSignOut&&this._messageListener.addListener(l.a.SignedOut,this._options.onSignOut),this._messageListener.addListener(l.a.FrameLoaded,function(){return c._configureStyles()})}return t.prototype.attach=function(){var t=this;return this._isAttached?Promise.resolve(this):(this._isAttached=!0,this._messageListener.listen(),this._loadingIndicator.show(this._options.containerId),this._allowCookie().then(function(){return t._attemptLogin()}).then(function(e){return t._iframeCreator.createFrame(e,t._options.containerId)}).then(function(e){t._iframe=e,t._configureStyles(),t._loadingIndicator.hide()}).catch(function(e){return t._isAttached=!1,t._retryAllowCookie(e).catch(function(){throw t._messageListener.trigger({type:l.a.FrameError,payload:e}),t._loadingIndicator.hide(),e})}).then(function(){return t}))},t.prototype.detach=function(){this._isAttached&&(this._isAttached=!1,this._messageListener.stopListen(),this._iframe&&this._iframe.parentNode&&(this._iframe.parentNode.removeChild(this._iframe),this._iframe.iFrameResizer.close()))},t.prototype._configureStyles=function(){this._iframe&&this._iframe.contentWindow&&this._options.styles&&(this._messagePoster.setTarget(this._iframe.contentWindow),this._messagePoster.post({type:m.a.StyleConfigured,payload:this._options.styles}))},t.prototype._attemptLogin=function(){return/^\/login\/token/.test(Object(c.a)(this._options.url).pathname)?this._requestSender.post(this._options.url).then(function(t){return t.body.redirectUrl}).catch(function(t){return Promise.reject(new h(t))}):Promise.resolve(this._options.url)},t.prototype._allowCookie=function(){if(this._storage.getItem("isCookieAllowed"))return this._storage.setItem("canRetryAllowCookie",!0),Promise.resolve();this._storage.removeItem("canRetryAllowCookie"),this._storage.setItem("isCookieAllowed",!0);var t=Object(c.a)(this._options.url).origin+"/embedded-checkout/allow-cookie?returnUrl="+encodeURIComponent(this._location.href);return document.body.style.visibility="hidden",this._location.replace(t),new Promise(function(){})},t.prototype._retryAllowCookie=function(t){return this._storage.getItem("canRetryAllowCookie")&&t instanceof f&&t.subtype===r.MissingContent?(this._storage.removeItem("canRetryAllowCookie"),this._storage.removeItem("isCookieAllowed"),this._allowCookie()):Promise.reject()},t=u.__decorate([d.a],t)}(),y=n(62),g=n(55),v={size:70,color:"#d9d9d9",backgroundColor:"#ffffff"},b="embedded-checkout-loading-indicator-rotation",w=function(){function t(t){this._styles=u.__assign({},v,t&&t.styles),this._defineAnimation(),this._container=this._buildContainer(),this._indicator=this._buildIndicator(),this._container.appendChild(this._indicator)}return t.prototype.show=function(t){if(t){var e=document.getElementById(t);if(!e)throw new Error("Unable to attach the loading indicator because the parent ID is not valid.");e.appendChild(this._container)}this._container.style.visibility="visible",this._container.style.opacity="1"},t.prototype.hide=function(){var t=this,e=function(){t._container.style.visibility="hidden",t._container.removeEventListener("transitionend",e)};this._container.addEventListener("transitionend",e),this._container.style.opacity="0"},t.prototype._buildContainer=function(){var t=document.createElement("div");return t.style.display="block",t.style.bottom="0",t.style.left="0",t.style.height="100%",t.style.width="100%",t.style.position="absolute",t.style.right="0",t.style.top="0",t.style.transition="all 250ms ease-out",t.style.opacity="0",t},t.prototype._buildIndicator=function(){var t=document.createElement("div");return t.style.display="block",t.style.width=this._styles.size+"px",t.style.height=this._styles.size+"px",t.style.borderRadius=this._styles.size+"px",t.style.border="solid 1px",t.style.borderColor=this._styles.backgroundColor+" "+this._styles.backgroundColor+" "+this._styles.color+" "+this._styles.color,t.style.margin="0 auto",t.style.position="absolute",t.style.left="0",t.style.right="0",t.style.top="50%",t.style.transform="translateY(-50%) rotate(0deg)",t.style.transformStyle="preserve-3d",t.style.animation=b+" 500ms infinite cubic-bezier(0.69, 0.31, 0.56, 0.83)",t},t.prototype._defineAnimation=function(){if(!document.getElementById(b)){var t=document.createElement("style");t.id=b,document.head.appendChild(t),t.sheet instanceof CSSStyleSheet&&t.sheet.insertRule("\n                @keyframes "+b+" {\n                    0% { transform: translateY(-50%) rotate(0deg); }\n                    100% { transform: translateY(-50%) rotate(360deg); }\n                }\n            ")}},t}(),C=n(75),E=n(44),O=function(){function t(t){this._options=t}return t.prototype.createFrame=function(t,e){var n=document.getElementById(e),i=(this._options||{}).timeout,o=void 0===i?6e4:i;if(!n)throw new f("Unable to embed the iframe because the container element could not be found.",r.MissingContainer);var s=document.createElement("iframe");return s.src=t,s.style.border="none",s.style.display="none",s.style.width="100%",s.allowPaymentRequest=!0,n.appendChild(s),this._toResizableFrame(s,o).catch(function(t){throw n.removeChild(s),t})},t.prototype._toResizableFrame=function(t,e){return new Promise(function(n,i){var o=window.setTimeout(function(){i(new f("Unable to embed the iframe because the content could not be loaded."))},e),s=function(e){if(e.origin===Object(c.a)(t.src).origin&&(Object(E.a)(e.data,l.a.FrameError)&&(a(),i(new f(e.data.payload.message,r.MissingContent))),Object(E.a)(e.data,l.a.FrameLoaded))){t.style.display="";var o=e.data.payload&&e.data.payload.contentId,s=Object(C.iframeResizer)({scrolling:!1,sizeWidth:!1,heightCalculationMethod:o?"taggedElement":"lowestElement"},t);a(),n(s[s.length-1])}},a=function(){window.removeEventListener("message",s),window.clearTimeout(o)};window.addEventListener("message",s)})},t}();n.d(e,"a",function(){return k});var L="BigCommerce.EmbeddedCheckout";function k(t){var e=Object(c.a)(t.url).origin;return new _(new O,new y.a(e),new g.a(e),new w({styles:t.styles&&t.styles.loadingIndicator}),Object(i.createRequestSender)(),new a(L),window.location,t).attach()}},11:function(t,e,n){"use strict";var r=n(0);var i=function(t){function e(e){var n,r,i=this.constructor,o=t.call(this,e||"An unexpected error has occurred.")||this;return o.type="standard",n=o,r=i.prototype,Object.setPrototypeOf?Object.setPrototypeOf(n,r):n.__proto__=r,"function"==typeof Error.captureStackTrace?Error.captureStackTrace(o,i):o.stack=new Error(o.message).stack,o}return r.__extends(e,t),e}(Error);e.a=i},138:function(t,e,n){"use strict";n.r(e);var r=n(103);n.d(e,"embedCheckout",function(){return r.a})},23:function(t,e,n){"use strict";var r;n.d(e,"a",function(){return r}),function(t){t.CheckoutComplete="CHECKOUT_COMPLETE",t.CheckoutError="CHECKOUT_ERROR",t.CheckoutLoaded="CHECKOUT_LOADED",t.FrameError="FRAME_ERROR",t.FrameLoaded="FRAME_LOADED",t.SignedOut="SIGNED_OUT"}(r||(r={}))},26:function(t,e,n){"use strict";var r=n(0),i=n(11),o={body:{},headers:{},status:0},s=function(t){function e(e,n){var r=void 0===n?{}:n,i=r.message,s=r.errors,a=this,c=e||o,u=c.body,d=c.headers,l=c.status;return(a=t.call(this,i||"An unexpected error has occurred.")||this).name="RequestError",a.type="request",a.body=u,a.headers=d,a.status=l,a.errors=s||[],a}return r.__extends(e,t),e}(i.a);e.a=s},31:function(t,e){t.exports=require("@bigcommerce/request-sender")},41:function(t,e,n){"use strict";var r=n(0),i=function(t){function e(e){var n=t.call(this,e||"Invalid arguments have been provided.")||this;return n.name="InvalidArgumentError",n.type="invalid_argument",n}return r.__extends(e,t),e}(n(11).a);e.a=i},44:function(t,e,n){"use strict";function r(t,e){return t.type===e}n.d(e,"a",function(){return r})},52:function(t,e){t.exports=require("local-storage-fallback")},55:function(t,e,n){"use strict";var r=n(80),i=function(){function t(t,e){this._targetWindow=e,this._targetOrigin="*"===t?"*":Object(r.a)(t).origin}return t.prototype.post=function(t){if(window!==this._targetWindow){if(!this._targetWindow)throw new Error("Unable to post message becauset target window is not set.");this._targetWindow.postMessage(t,this._targetOrigin)}},t.prototype.setTarget=function(t){this._targetWindow=t},t}();e.a=i},61:function(t,e,n){"use strict";var r;n.d(e,"a",function(){return r}),function(t){t.StyleConfigured="STYLE_CONFIGURED"}(r||(r={}))},62:function(t,e,n){"use strict";var r=n(0),i=n(80),o=n(69),s=n(44),a=function(){function t(t){this._sourceOrigin=Object(i.a)(t).origin,this._isListening=!1,this._listeners={}}return t.prototype.listen=function(){this._isListening||(this._isListening=!0,window.addEventListener("message",this._handleMessage))},t.prototype.stopListen=function(){this._isListening&&(this._isListening=!1,window.removeEventListener("message",this._handleMessage))},t.prototype.addListener=function(t,e){var n=this._listeners[t];n||(this._listeners[t]=n=[]),n.push(e)},t.prototype.removeListener=function(t,e){var n=this._listeners[t];if(n){var r=n.indexOf(e);r>=0&&n.splice(r,1)}},t.prototype.trigger=function(t){var e=this._listeners[t.type];e&&e.forEach(function(e){return e(t)})},t.prototype._handleMessage=function(t){t.origin===this._sourceOrigin&&Object(s.a)(t.data,t.data.type)&&this.trigger(t.data)},r.__decorate([o.a],t.prototype,"_handleMessage",null),t}();e.a=a},69:function(t,e,n){"use strict";n.d(e,"a",function(){return i});var r=n(0);function i(t,e,n){return e&&n?o(t,e,n):function(t){var e=function(t){function e(){return null!==t&&t.apply(this,arguments)||this}return r.__extends(e,t),e}(t);return Object.getOwnPropertyNames(t.prototype).forEach(function(n){var r=Object.getOwnPropertyDescriptor(t.prototype,n);r&&"constructor"!==n&&Object.defineProperty(e.prototype,n,o(t.prototype,n,r))}),e}(t)}function o(t,e,n){if("function"!=typeof n.value)return n;var i=n.value;return{get:function(){var t=i.bind(this);return Object.defineProperty(this,e,r.__assign({},n,{value:t})),t},set:function(t){i=t}}}},75:function(t,e){t.exports=require("iframe-resizer")},80:function(t,e,n){"use strict";n.d(e,"a",function(){return i});var r=n(41);function i(t){if(!/^(https?:)?\/\//.test(t))throw new r.a("The provided URL must be absolute.");var e=document.createElement("a");return e.href=t,{hash:e.hash,hostname:e.hostname,href:e.href,origin:e.origin,pathname:e.pathname,port:e.port,protocol:e.protocol,search:e.search}}}});
//# sourceMappingURL=embedded-checkout.js.map