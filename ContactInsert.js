   exports.handler = function(context, event, callback) {
   	let twiml = new Twilio.twiml.MessagingResponse();
   	
   	const got = require('got');
const jwt = require('jsonwebtoken');
const FormData = require('form-data');
	
    var sfAuthReponse;
    var platformEvent;
    var phoneNumber=event.From; 
     console.log(phoneNumber);
     if(phoneNumber.indexOf("+")>-1)
    {
        phoneNumber=phoneNumber.split('+')[1];
        
    }
    console.log(phoneNumber);
    var recordId="dd";
    var cc = require('randomatic');
    var coupon=cc('A',4);
    var querystring = require('querystring');
    var request = require('request');
    var isSandbox = (context.SF_IS_SANDBOX == 'true');
    var clientId = context.SF_CONSUMER_KEY;
    var clientSecret = context.SF_CONSUMER_SECRET;
    var sfUserName = context.SF_USERNAME;
    var sfPassword = context.SF_PASSWORD;
    var sfToken = context.SF_TOKEN;
    var useNameSpace = false;
    var nameSpace = 'TwilioSF__';
    var salesforceUrl = 'https://login.salesforce.com';

    if(isSandbox === false) {
        salesforceUrl = 'https://test.salesforce.com';
    }

    run();
    function run(){
        var form = {
            grant_type: 'password',
            client_id: clientId,
            client_secret: clientSecret,
            username: sfUserName,
            password:sfPassword+sfToken
        };

        var formData = querystring.stringify(form);
        var contentLength = formData.length;

        request({
            headers: {
                'Content-Length': contentLength,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            uri: salesforceUrl +'/services/oauth2/token',
            body: formData,
            method: 'POST'
        }, function (err, res, body) {
            if(res.statusCode == 200){
                console.log('Success Getting Token');
                 sfAuthReponse = JSON.parse(body);
                console.log(sfAuthReponse);
                 platformEvent = buildPlatformEvent(event);
                 getresponsebygot();
               if(recordId=="" || recordId==null || recordId==undefined)
               {
                 
               }
               
               
               
               
            } else{
                finishWithError('Error Getting Token:'+body);
            }
        });
    }

    /**
     * Posts Platform Event To Salesforce
     * @param sfAuthReponse
     * @param platformEvent
     */
    function postPlatformEvent(sfAuthReponse,platformEvent){
        var lastFive = phoneNumber.substr(phoneNumber.length - 4);
        console.log('Posting Platform Event:',platformEvent);

        var options = {
            uri: sfAuthReponse.instance_url + getPlatformEventUrl(),
            headers: {
                'Authorization': 'Bearer ' + sfAuthReponse.access_token,
        
                'Content-Type': 'application/json'
        
                
            },
        body:{"Phone":phoneNumber,"LastName":"Customer-"+lastFive,"AssistantName":"Customer-"+lastFive,"promocode__c":coupon},
       
            json:true,
            method: 'POST'
        };
        console.log(options);
        request(options, processEventResponse);
    }
    
    function getresponsebygot()
    {
           return got(`${sfAuthReponse.instance_url}/services/data/v41.0/query/`, {
        headers:  {
                'Authorization': 'Bearer ' + sfAuthReponse.access_token,
        
                'Content-Type': 'application/json'},
        query:
          'q=' +
          encodeURIComponent(
            `SELECT Id from Contact WHERE Phone = '${phoneNumber}'`
          )
      }).then(response => {
      const attributes = JSON.parse(response.body);

      console.log(`found: ${attributes.records.length} records`);
       if (attributes.records.length !== 0) {
           console.log("entered inside where record is not  null");
             recordId=attributes.records[0].Id;
             twiml.message("You are already registered with us");
               callback("Not Ok", twiml);
            
      } else {
        
         postPlatformEvent(sfAuthReponse,platformEvent);
      }
    })
    .catch(error => {
      console.error(error);
      callback(error);
    });
    }
   
    
    
    function getPlatformEvent(sfAuthReponse,platformEvent){

        console.log('Posting Platform Event:',platformEvent);

        var options = {
            uri: sfAuthReponse.instance_url + getPlatformEventUrlForSoQL(),
            headers: {
                'Authorization': 'Bearer ' + sfAuthReponse.access_token,
        
                'Content-Type': 'application/json'},
        body:{},
       
            json:true,
            method: 'GET'
        };
        console.log(options);
        request(options, processgetResponse);
    }
    
    
    

    /**
     * Processes Platform Event Response
     * @param error
     * @param response
     * @param body
     */
    function processEventResponse(error, response, body) {
        console.log("Responded :  "+response);
        console.log("bodu   :  "+body);
        if (!error && response.statusCode == 201) {
            console.log('Success Posting Platform Event:  Server responded with:', body);
            finishSuccess();
        } else{
            console.error('Error Posting Platform Event:', body);
            finishWithError('Error Posting Platform Event:'+body);
        }
        
        	//callback(null, twiml);
    }
    
    
     function processgetResponse(error, response, body) {
         console.log("response L   :"+ response.body.records);
         if(response.body.records!=null && response.body.records!=undefined && response.body.records.length>0)
         {
             console.log("entered inside where record is not  null");
             recordId=response.body.records[0].Id;
             twiml.message("You have already resgistered with us.");
	         callback("Not Ok", twiml);
              finishWithError("record exists");
          }
          else
           
          {
               postPlatformEvent(sfAuthReponse,platformEvent);
             
              console.log("entered inside where record id null");
          }
       
      
      
        
        	//callback(null, twiml);
    }

    /**
     * Builds the platform event request
     * @param event
     */
    function buildPlatformEvent(event){
        //Object map that maps Twilio Field to Salesforce Field
        var eventToPEMap = {
            "Body":"Body__c",
            "To":"To__c",
            "From":"From__c",
            "AccountSid":"AccountSid__c",
            "SmsSid":"MessageSid__c",
            "MessagingServiceSid":"MessagingServiceSid__c",
            "SmsStatus":"SmsStatus__c",
            "ErrorCode":"ErrorCode__c"
        };

        var platformEvent = {};

        //Loop through event and build platform event
        for (var property in event) {
            if (eventToPEMap.hasOwnProperty(property)) {
                var eventProp;
                if(useNameSpace){
                    eventProp =  nameSpace + eventToPEMap[property];
                } else{
                    eventProp = eventToPEMap[property];
                }
                platformEvent[eventProp] = event[property];
            }
        }
        return platformEvent;
    }

    /**
     * Gets the Salesforce services url for the platform event
     * @returns {string}
     */
    function getPlatformEventUrl(){
        //return 'https://na55.salesforce.com/services/data/v44.0/sobjects/contact';
        if(useNameSpace){
            return '/services/data/v44.0/sobjects/contact';
        } else{
            return '/services/data/v44.0/sobjects/contact';
        }
    }
    
    
    function getPlatformEventUrlForSoQL(){
        //return 'https://na55.salesforce.com/services/data/v44.0/sobjects/contact';
        
        

        
        
        if(useNameSpace){
            return "/services/data/v44.0/query?q=SELECT+Id+from+Contact+WHERE+Phone='"+phoneNumber.split('+')[1]+"'";
        } else{
            return "/services/data/v44.0/query?q=SELECT+Id+from+Contact+WHERE+Phone='"+phoneNumber.split('+')[1]+"'";
        }
    }

    function finishSuccess(body){
        callback();
    }
    function finishWithError(body){
        callback(body);
    }
};
