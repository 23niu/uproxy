/**
 * util.ts
 *
 * This file contains helpers for the uProxy Core.
 */


/**
 * This is the beginning of a generic Finite-State-Machine.
 * Operates on States of type S using transitions of type T. Assumes S and T are
 * Enums of some variety.
 *
 * This is utilized for pieces like the Consent.
 *
 * States are implied by numbers, which although we might want to use Enums,
 * typescript fails to provide us the ability to index by anything other
 * than 'string' or 'number'. [TS1023]
 *
 * This particular implementation does not care about accept/reject states. It
 * just provides the means for preparing the transition table.
 */
class FSM<S, T> {

  private table:{[start:number]:{[transition:number]:S}} = {}

  /**
   * Sets a transition on the state machine, and auto-creates new states.
   */
  public set = (start:S, transition:T, dest:S) => {
    // Typescript is not smart enough to propogate the fact that an Enum type is
    // in fact a subtype of number, through to this point.
    // Therefore, abuse double-casting.
    var startIndex = <number><any>start;
    var transitionIndex = <number><any>transition;
    if (!(startIndex in this.table)) {
      this.table[startIndex] = {};
    }
    this.table[startIndex][transitionIndex] = dest;
  }

  /**
   * Gets the destination state, given a start state and transition.
   * If either the start state or transition don't exist on the FSM, returns
   * null.
   */
  public get = (start:S, transition:T) : S => {
    var startIndex = <number><any>start;
    var transitionIndex = <number><any>transition;
    if (!(startIndex in this.table)) {
      return null;
    }
    if (!(transitionIndex in this.table[startIndex])) {
      return null;
    }
    return this.table[startIndex][transitionIndex];
  }

}  // class FSM

function linear_congruence_gen(prior) {
  return (1 + prior * 16807) % 2147483647;
}

function list_erase(list, obj_to_remove) {
  var index = list.indexOf(obj_to_remove);
  if (index < 0) {
    return list;
  } else {
    return list.splice(index, 1);
  }
}

// TODO: Actually implement the logging levels around the code.
function makeLogger(level) {
  var logFunc = console[level];
  if (logFunc) {
    return logFunc.bind(console);
  }
  return function () {
    var s = '[' + level.toUpperCase() + '] ';
    for (var i=0, ii=arguments[i]; i<arguments.length; s+=ii+' ', ii=arguments[++i]) {
      ii = typeof ii === 'string' ? ii :
           ii instanceof Error ? ii.toString() :
           JSON.stringify(ii);
    }
    console.log(s);
  };
}

/**
 * Given an array or object, returns a deep copy. Given a primitive type,
 * returns the input unchanged (since such values are immutable).
 *
 * When cloning objects, copies only enumerable properties.
 *
 * Reference handling:
 *   - Does not attempt to handle cyclical references correctly.
 *   - Creates a new copy for each occurrence of a reference. Every reference
 *     in the output will be unique, even if the input contains multiple
 *     identical references.
 *
 * Throws an exception if asked to clone a function.
 */
function cloneDeep(val) {
  // Handle null separately, since typeof null === 'object'.
  if (val === null) {
    return null;
  }

  switch (typeof val) {
    case 'boolean':
      // fallthrough intended
    case 'number':
      // fallthrough intended
    case 'string':
      return val;

    case 'undefined':
      return undefined;

    case 'object': {
      if (Array.isArray(val)) {
        var arrayClone = new Array(val.length);
        for (var i = 0; i < val.length; i++) {
          arrayClone[i] = cloneDeep(val[i]);
        }
        return arrayClone;
      } else {
        var objectClone = {};
        for (var propertyName in val) {
          objectClone[propertyName] = cloneDeep(val[propertyName]);
        }
        return objectClone;
      }
    }

    case 'function':
      throw new Error('Functions cannot be cloned');
    default:
      throw new Error('Unsupported input type [' + (typeof val) + ']');
  }
}

/**
 * TODO: Replace with the faster regex one from sas-rtc.
 * This function extracts the cryptographic key used to encrypt the data media
 * type (mid:data) from the provided sdp headers string. If no key can be
 * determined, this function returns null.
 *
 * For example, given the below header:
 *
 * a=crypto:1 AES_CM_128_HMAC_SHA1_80
 * inline:FZoIzaV2KYVbd1mO445wH9NNIcE3tbKz0X0AtEok
 *
 * This function will return:
 *
 * FZoIzaV2KYVbd1mO445wH9NNIcE3tbKz0X0AtEok
 *
 * See http://tools.ietf.org/html/rfc4568#section-4 and
 * http://tools.ietf.org/html/rfc4568#section-9.1
 *
 * @param msg
 * @returns
 */
function extractCryptoKey(sdpHeaders) {
  // Process all the SDP header lines
  var lines = sdpHeaders.split(/\r?\n/),
      currentLine,
      midDataFound = false,
      keyParams,
      keyParam,
      i, j;

  for (i in lines) {
    currentLine = lines[i];
    if (!midDataFound) {
      if (currentLine === 'a=mid:data') {
        midDataFound = true;
      }
    } else {
      if (0 === currentLine.indexOf('a=crypto:1')) {
        keyParams = currentLine.substring(currentLine.indexOf(" ", 11) + 1).split(" ");
        for (j in keyParams) {
          keyParam = keyParams[j];
          if (keyParam.indexOf('inline:') === 0) {
            return keyParam.substring(7);
          }
        }
      }
    }
  }

  return null;
}


function valuesOf(dict:{[keys:string]:any}) {
  return Object.keys(dict).map((key) => { return dict[key]; });
}
