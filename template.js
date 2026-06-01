const encodeUriComponent = require('encodeUriComponent');
const getAllEventData = require('getAllEventData');
const getCookieValues = require('getCookieValues');
const getRequestHeader = require('getRequestHeader');
const getType = require('getType');
const makeString = require('makeString');
const makeTableMap = require('makeTableMap');
const parseUrl = require('parseUrl');
const sendHttpRequest = require('sendHttpRequest');
const setCookie = require('setCookie');

/*==============================================================================
==============================================================================*/

const eventData = getAllEventData();

if (!isConsentGivenOrNotRequired()) {
  return data.gtmOnSuccess();
}

if (data.type === 'page_view') {
  const url = eventData.page_location || getRequestHeader('referer');

  if (url) {
    const value = parseUrl(url).searchParams[data.clickIdParameterName];

    if (value) {
      const options = {
        domain: 'auto',
        path: '/',
        secure: true,
        httpOnly: false,
        'max-age': 86400 * 395
      };

      setCookie('cje', value, options, false);
    }
  }

  return data.gtmOnSuccess();
} else {
  const requestUrl = getRequestUrl();

  sendHttpRequest(
    requestUrl,
    (statusCode, headers, body) => {
      if (!data.useOptimisticScenario) {
        if (statusCode >= 200 && statusCode < 300) {
          data.gtmOnSuccess();
        } else {
          data.gtmOnFailure();
        }
      }
    },
    { method: 'GET' }
  );

  if (data.useOptimisticScenario) {
    return data.gtmOnSuccess();
  }
}

/*==============================================================================
VENDOR RELATED FUNCTIONS
==============================================================================*/

function getRequestUrl() {
  // CJ assigned ID for your program
  let requestUrl = 'https://www.emjcd.com/u?CID=' + enc(data.cid);
  // CJ event type
  requestUrl = requestUrl + '&TYPE=' + enc(data.actionId);
  // CJ method
  requestUrl = requestUrl + '&METHOD=S2S';
  // CJ event ID
  const CJEVENT = getCookieValues('cje')[0] || '';
  if (CJEVENT) {
    requestUrl = requestUrl + '&CJEVENT=' + enc(CJEVENT);
  }
  // CJ event time
  const eventTime = data.conversionDateTime || eventData.conversionDateTime;
  if (eventTime) {
    requestUrl = requestUrl + '&EVENTTIME=' + enc(eventTime);
  }
  // CJ order ID
  const orderId =
    data.orderId || eventData.orderId || eventData.order_id || eventData.transaction_id;
  if (orderId) {
    requestUrl = requestUrl + '&OID=' + enc(orderId);
  }
  // CJ currency
  const currency = data.currencyCode || eventData.currencyCode || eventData.currency;
  if (currency) {
    requestUrl = requestUrl + '&CURRENCY=' + enc(currency);
  }
  // CJ coupon
  const coupon = data.coupon || eventData.coupon;
  if (coupon) {
    requestUrl = requestUrl + '&COUPON=' + enc(coupon);
  }
  // CJ discount
  const discount = data.discount || eventData.discount;
  if (discount) {
    requestUrl = requestUrl + '&DISCOUNT=' + enc(discount);
  }
  // CJ ITEMx, AMTx, QTYx, DCNTx
  const items = data.items || eventData.items || [];
  if (getType(items) === 'array') {
    const itemKeys = makeTableMap(data.itemKeys || [], 'key', 'value') || {};
    const itemIdKey = itemKeys.item_id || 'item_id';
    const itemPriceKey = itemKeys.price || 'price';
    const itemQuantityKey = itemKeys.quantity || 'quantity';
    const itemDiscountKey = itemKeys.discount || 'discount';
    items
      .filter((item) => item && item[itemIdKey])
      .forEach((item, index) => {
        const x = index + 1;
        requestUrl = requestUrl + '&ITEM' + x + '=' + enc(item[itemIdKey]);
        requestUrl = requestUrl + '&AMT' + x + '=' + enc(item[itemPriceKey] || 0);
        requestUrl = requestUrl + '&QTY' + x + '=' + enc(item[itemQuantityKey] || 1);
        requestUrl = requestUrl + '&DCNT' + x + '=' + enc(item[itemDiscountKey] || 0);
      });
  }
  // CJ customer status
  const customerStatus = data.customerStatus || eventData.customerStatus;
  if (customerStatus) {
    requestUrl = requestUrl + '&CUST_STATUS=' + enc(customerStatus);
  }
  if (data.amount) {
    requestUrl = requestUrl + '&amount=' + enc(data.amount);
  }
  requestUrl = requestUrl + '&trackingSource=stapeio';
  return requestUrl;
}

/*==============================================================================
HELPERS
==============================================================================*/

function enc(data) {
  if (['null', 'undefined'].indexOf(getType(data)) !== -1) data = '';
  return encodeUriComponent(makeString(data));
}

function isConsentGivenOrNotRequired() {
  if (data.adStorageConsent !== 'required') return true;
  if (eventData.consent_state) return !!eventData.consent_state.ad_storage;
  const xGaGcs = eventData['x-ga-gcs'] || ''; // x-ga-gcs is a string like "G110"
  return xGaGcs[2] === '1';
}
