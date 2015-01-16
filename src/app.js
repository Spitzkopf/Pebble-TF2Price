/**
 * Welcome to Pebble.js!
 *
 * This is where you write your app.
 */

var UI = require('ui');
var apikeys = require('apikeys');
var ajax = require('ajax');

//find method not defined for array, so lets make our own
Array.prototype.find = function find(test, ctx) {
    var result = null;
    this.some(function(el, i) {
        return test.call(ctx, el, i, this) ? ((result = el), true) : false;
    });
    return result;
};

var tf2api = new SteamTF2API(apikeys.STEAM_API_KEY);
var bptfapi = new BackpackTFAPI(apikeys.BACKPACKTF_API_KEY);

function BackpackTFAPI(apiKey) {
  this.apiKey = apiKey;
}

BackpackTFAPI.prototype.GET_PRICES = 'http://backpack.tf/api/IGetPrices/v4/?key=';

function SteamTF2API(apiKey) {
  this.apiKey = apiKey;
}

SteamTF2API.prototype.GAME_ID = '440';
SteamTF2API.prototype.BASE_URL = 'http://api.steampowered.com/IEconItems_';
SteamTF2API.prototype.SCHEMA_METHOD = 'GetSchema';
SteamTF2API.prototype.VERSION = 'v0001';

SteamTF2API.prototype.getTF2ItemSchema = function(language, successCallback, failureCallback) {
    var requestURL = this.BASE_URL + this.GAME_ID + '/' + this.SCHEMA_METHOD + '/' + this.VERSION + '/' + "?key=" + this.apiKey + "&language=" + language;
    ajax(
      {
        url: requestURL,
        method: 'get',
        type: 'json'
      },
      function(schema) {
        console.log("steam schema success");
        successCallback(schema);
      },
      function(error) {
        console.log("steam schema failure");
        failureCallback(error);
      }
    );
};

function BackpackTFAPI(apiKey) {
  this.apiKey = apiKey;
}

BackpackTFAPI.prototype.API_URL = "http://backpack.tf/api";
BackpackTFAPI.prototype.GET_PRICE_METHONG = "IGetPrices";
BackpackTFAPI.prototype.VERSION = "v4";

BackpackTFAPI.prototype.getBPTFPriceSchema = function(successCallback, failureCallback) {
  var requestURL = this.API_URL + '/' + this.GET_PRICE_METHONG + '/' + this.VERSION + '/' + "?key=" + this.apiKey;
  ajax(
    {
      url: requestURL,
      method: 'get',
      type: 'json'
    },
    function(schema) {
      console.log("bp tf price schema success");
      successCallback(schema);
    },
    function(error) {
      console.log("bp tf price schema failure");
      failureCallback(error);
    }
  );
};

var mergeSchemas = function(bpSchema, steamSchema) {
  var steamSchemaItems = steamSchema.items;
  var bpItemList = [];
  
  for (var item in bpSchema.items) {
    bpSchema.items[item].australium = (0 === item.indexOf("Australium"));
    bpItemList.push(bpSchema.items[item]);
  }
  
  bpItemList.sort(function (first, second) { return first.defindex[0] - second.defindex[0]; });
  return bpItemList.map(function(item) {
    var mergedItem = item;
    var matchingItem = steamSchemaItems.find(function(steamitem) {
      return (-1 != item.defindex.indexOf(steamitem.defindex));
    });
    
    if (null !== matchingItem) {
        mergedItem.schemaLink = matchingItem;
    } else {
      return null;
    }
    
    return mergedItem;
  }).filter(function(item) { return null !== item; });
};

var generateItemCardBody = function(item, steamSchema) {
  var text = "Prices:\n";
  for (var quality in item.prices){
    
    var currentQuality = steamSchema.qualityNames[steamSchema.qualities[quality]];
    var tradeable = item.prices[quality].Tradable;
    
    for(var craftability in tradeable) {
      var currentPrice = tradeable[craftability][0].value;
      var currency =  tradeable[craftability][0].currency;
      
      text += currentQuality + "(" + craftability + ")" + ":\n";
      text +=  currentPrice + " " + currency + "\n";
    }
  }
  return text;
};

var flipSteamSchemaNameToQualityId = function(steamSchema) {
  var updatedSchema = steamSchema;
  for (var quality in updatedSchema.qualities){
    var qualityNumber = updatedSchema.qualities[quality];
    var qualityName = quality;
    updatedSchema.qualities[qualityNumber.toString()] = qualityName;
    delete updatedSchema.qualities[quality];
  }
  return updatedSchema;
};

var applicationUI = function(itemlist, tf2schema) {
  var byLetter = new UI.Menu({
    sections: [{
      title: 'By Letter',
      items: "abcdefghijklmnopqrstuvwxyz".toUpperCase().split("").map(function(item){ return {"title": item}; })
      }]
  });
  
  byLetter.on('select', function(selected) {
    var matches = itemlist.filter(function(item) {
      return 0 === item.schemaLink.item_name.indexOf(selected.item.title);
    });
    
    var letterMatched = new UI.Menu({
      sections: [{
        title: selected,
        items: matches.map(function(item) { return { "title": (item.australium ? "Australium " : "") + item.schemaLink.item_name }; })
      }]
    });
    
    letterMatched.on('select', function(itemSelected){
      var item = matches[itemSelected.itemIndex];
      var itemCard = new UI.Card({
        title: (item.australium ? "Australium " : "") + item.schemaLink.item_name,
        body: generateItemCardBody(matches[itemSelected.itemIndex], tf2schema),
        style: "small",
        scrollable: true
      });
      
      itemCard.show();
    });
    
    letterMatched.show();
  });
  
  byLetter.show();
};

var handleTF2Schema = function(schema) {
  bptfapi.getBPTFPriceSchema(function(priceSchema) {
    schema.result = flipSteamSchemaNameToQualityId(schema.result);
    var merged = mergeSchemas(priceSchema.response, schema.result);
    applicationUI(merged, schema.result);
  }, 
  function (error) {
    console.log(error);
  });
} ;            

tf2api.getTF2ItemSchema("en", handleTF2Schema, function(error){ console.log(error); });