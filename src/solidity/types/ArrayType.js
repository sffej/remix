'use strict'
var util = require('./util')
var BN = require('ethereumjs-util').BN
var RefType = require('./RefType')

class ArrayType extends RefType {

  constructor (underlyingType, arraySize, location) {
    var storageSlots = null
    if (arraySize === 'dynamic') {
      storageSlots = 1
    } else {
      if (underlyingType.storageBytes < 32) {
        var itemPerSlot = Math.floor(32 / underlyingType.storageBytes)
        storageSlots = Math.ceil(arraySize / itemPerSlot)
      } else {
        storageSlots = arraySize * underlyingType.storageSlots
      }
    }
    var size = arraySize !== 'dynamic' ? arraySize : ''
    super(storageSlots, 32, underlyingType.typeName + '[' + size + ']', location)
    this.underlyingType = underlyingType
    this.arraySize = arraySize
  }

  decodeFromStorage (location, storageContent) {
    var ret = []
    var size = null
    var slotValue = util.extractHexValue(location, storageContent, this.storageBytes)
    var currentLocation = {
      offset: 0,
      slot: location.slot
    }
    if (this.arraySize === 'dynamic') {
      size = util.toBN('0x' + slotValue)
      currentLocation.slot = util.sha3(location.slot)
    } else {
      size = new BN(this.arraySize)
    }
    var k = util.toBN(0)
    for (; k.lt(size) && k.ltn(300); k.iaddn(1)) {
      ret.push(this.underlyingType.decodeFromStorage(currentLocation, storageContent))
      if (this.underlyingType.storageSlots === 1 && location.offset + this.underlyingType.storageBytes <= 32) {
        currentLocation.offset += this.underlyingType.storageBytes
        if (currentLocation.offset + this.underlyingType.storageBytes > 32) {
          currentLocation.offset = 0
          currentLocation.slot = '0x' + util.add(currentLocation.slot, 1).toString(16)
        }
      } else {
        currentLocation.slot = '0x' + util.add(currentLocation.slot, this.underlyingType.storageSlots).toString(16)
        currentLocation.offset = 0
      }
    }
    return {
      value: ret,
      length: '0x' + size.toString(16),
      type: this.typeName
    }
  }

  decodeFromMemoryInternal (offset, memory) {
    var ret = []
    var length = this.arraySize
    if (this.arraySize === 'dynamic') {
      length = memory.substr(2 * offset, 64)
      length = parseInt(length, 16)
      offset = offset + 32
    }
    for (var k = 0; k < length; k++) {
      var contentOffset = offset
      ret.push(this.underlyingType.decodeFromMemory(contentOffset, memory))
      offset += 32
    }
    return {
      value: ret,
      length: '0x' + length.toString(16),
      type: this.typeName
    }
  }
}

module.exports = ArrayType
