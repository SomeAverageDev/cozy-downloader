
const cozydb = require('cozydb');
const debug = require('debug')('downloader');
const fs = require('fs');
const path = require('path');
const Polyglot = require('node-polyglot');
const pug = require('pug');

const LOCALE_PATH = path.resolve(__dirname, '../../server/locales/');

LocalizationManager = (function() {
  debug ('LocalizationManager:start');
  debug ('LocalizationManager:LOCALE_PATH:'+LOCALE_PATH);
  function LocalizationManager() {}

  LocalizationManager.prototype.polyglot = null;

  LocalizationManager.prototype.templateCache = {};
  debug ('LocalizationManager.prototype.templateCache');

  LocalizationManager.prototype.initialize = function(callback) {
    debug ('LocalizationManager.prototype.initialize');
    if (callback == null) {
      callback = function() {};
    }
    return this.retrieveLocale((function(_this) {
      debug ('LocalizationManager.prototype.retrieveLocale:callback');
      return function(err, locale) {
        debug('locale:', locale);
        if (err != null) {
          _this.updateLocale(null);
        } else {
          _this.updateLocale(locale);
        }
        return callback(null, _this.polyglot);
      };
    })(this));
  };

  LocalizationManager.prototype.retrieveLocale = function(callback) {
    debug ('LocalizationManager.prototype.retrieveLocale');
    return cozydb.api.getCozyLocale(function(err, locale) {
      if ((err != null) || !locale) {
        locale = 'en';
      }
      return callback(err, locale);
    });
  };

  LocalizationManager.prototype.updateLocale = function(locale) {
    debug ('LocalizationManager.prototype.updateLocale');
    this.polyglot = this.getPolyglotByLocale(locale);
    return this.prepareEmailsTemplate();
  };

  LocalizationManager.prototype.getPolyglotByLocale = function(locale) {
    debug ('LocalizationManager.prototype.getPolyglotByLocale');
    var err, error, phrases;
    try {
      phrases = require(LOCALE_PATH + "/" + locale);
    } catch (error) {
      err = error;
      debug ('LocalizationManager.prototype.getPolyglotByLocale:error', err);
      phrases = require(LOCALE_PATH + "/en");
    }
    return new Polyglot({
      locale: locale,
      phrases: phrases
    });
  };

  LocalizationManager.prototype.prepareEmailsTemplate = function() {
    debug ('LocalizationManager.prototype.prepareEmailsTemplate');
    var cacheKey, i, len, locale, name, ref, results;
    locale = this.getLocale();
    ref = ['mail_download', 'mail_download_error'];
    results = [];
    for (i = 0, len = ref.length; i < len; i++) {
      name = ref[i];
      cacheKey = name + "_" + locale;
      results.push(this.templateCache[cacheKey] = this.buildEmailTemplate(name));
    }
    return results;
  };

  LocalizationManager.prototype.t = function(key, params) {
    debug ('LocalizationManager.prototype.t');
    var ref;
    if (params == null) {
      params = {};
    }
    return (ref = this.polyglot) != null ? ref.t(key, params) : void 0;
  };

  LocalizationManager.prototype.buildEmailTemplate = function(name) {
    debug ('LocalizationManager.prototype.buildEmailTemplate:name', name);
    var err, error, filePath, templatefile;
    try {
      filePath = "../mails/" + this.polyglot.currentLocale + "/" + name + ".pug";
      templatefile = require('path').join(__dirname, filePath);
      debug ('LocalizationManager.prototype.buildEmailTemplate:filePath', filePath);
      debug ('LocalizationManager.prototype.buildEmailTemplate:templatefile', templatefile);
      return pug.compile(fs.readFileSync(templatefile, 'utf8'));
    } catch (error) {
      err = error;
      filePath = "../mails/en/" + name + ".pug";
      templatefile = require('path').join(__dirname, filePath);
      return pug.compile(fs.readFileSync(templatefile, 'utf8'));
    }
  };

  LocalizationManager.prototype.getEmailTemplate = function(name) {
    debug ('LocalizationManager.prototype.getEmailTemplate');
    var cacheKey;
    cacheKey = name + "_" + (this.getLocale());
    debug ('LocalizationManager.prototype.getEmailTemplate:cacheKey', cacheKey);
    if (this.templateCache[cacheKey] == null) {
      this.templateCache[cacheKey] = this.buildEmailTemplate(name);
    }
    return this.templateCache[cacheKey];
  };

  LocalizationManager.prototype.getLocale = function() {
    debug ('LocalizationManager.prototype.getLocale');
    return this.polyglot.currentLocale;
  };

  LocalizationManager.prototype.getPolyglot = function() {
    debug ('LocalizationManager.prototype.getPolyglot');
    return this.polyglot;
  };

  return LocalizationManager;

})();

module.exports = new LocalizationManager();
