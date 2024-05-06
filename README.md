# CJ tag for Google Tag Manager Server Side

There are two types of events that CJ tag includes: PageView and Conversion.

- Pageview event stores the CJEVENT URL parameter inside the cje cookie.
- Conversion event sends a request with the specified conversion event data to CJ postback URL.

## How to use the CJ tag:

**Pageview** - add the CJ tag to the pageview event.

**Conversion events** 

Required parameters:
- **CID** - CJ assigned ID for your program
- **Type** - Also referred to as Action ID, this is a CJ assigned value that identifies the action being tracked

Also, you can override values of the following parameters which will be parsed from eventData by default:
- **Conversion Date Time**
- **Order ID**
- **Currency Code**
- **Coupon**
- **Discount**
- **Items**


### Useful links:

- https://stape.io/blog/cj-server-to-server-tracking-using-sever-google-tag-manager

## Open Source

CJ Tag for GTM Server Side is developed and maintained by [Stape Team](https://stape.io/) under the Apache 2.0 license.
