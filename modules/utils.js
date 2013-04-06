module.exports = {

  // Object to array converter
  oc: function(a) {
    var o = {};
    for(var i=0;i<a.length;i++)
    {
      o[a[i]]='';
    }
    return o;
  },

  toSpine: function(modelObject) {
    var id = modelObject._id;
    modelObject.id = id;
    delete modelObject['_id'];
    return modelObject;
  }

}
