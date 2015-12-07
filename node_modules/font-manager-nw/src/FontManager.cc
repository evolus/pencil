#include <stdlib.h>
#include <node.h>
#include <uv.h>
#include <v8.h>
#include <nan.h>
#include "FontDescriptor.h"

using namespace v8;

// these functions are implemented by the platform
ResultSet *getAvailableFonts();
ResultSet *findFonts(FontDescriptor *);
FontDescriptor *findFont(FontDescriptor *);
FontDescriptor *substituteFont(char *, char *);

// converts a ResultSet to a JavaScript array
Local<Array> collectResults(ResultSet *results) {
  NanEscapableScope();
  Local<Array> res = NanNew<Array>(results->size());
    
  int i = 0;
  for (ResultSet::iterator it = results->begin(); it != results->end(); it++) {
    res->Set(i++, (*it)->toJSObject());
  }
  
  delete results;
  return NanEscapeScope(res);
}

// converts a FontDescriptor to a JavaScript object
Handle<Value> wrapResult(FontDescriptor *result) {
  NanEscapableScope();
  if (result == NULL)
    return NanEscapeScope(NanNull());
  
  Local<Object> res = result->toJSObject();
  delete result;
  return NanEscapeScope(res);
}

// holds data about an operation that will be 
// performed on a background thread
struct AsyncRequest {
  uv_work_t work;
  FontDescriptor *desc;     // used by findFont and findFonts
  char *postscriptName;     // used by substituteFont
  char *substitutionString; // ditto
  FontDescriptor *result;   // for functions with a single result
  ResultSet *results;       // for functions with multiple results
  NanCallback *callback;    // the actual JS callback to call when we are done
  
  AsyncRequest(Local<Value> v) {
    work.data = (void *)this;
    callback = new NanCallback(v.As<Function>());
    desc = NULL;
    postscriptName = NULL;
    substitutionString = NULL;
    result = NULL;
    results = NULL;
  }
  
  ~AsyncRequest() {
    delete callback;
    
    if (desc)
      delete desc;
    
    if (postscriptName)
      delete postscriptName;
    
    if (substitutionString)
      delete substitutionString;
    
    // result/results deleted by wrapResult/collectResults respectively
  }
};

// calls the JavaScript callback for a request
void asyncCallback(uv_work_t *work) {
  NanScope();
  AsyncRequest *req = (AsyncRequest *) work->data;
  Handle<Value> args[1];
  
  if (req->results) {
    args[0] = collectResults(req->results);
  } else if (req->result) {
    args[0] = wrapResult(req->result);
  } else {
    args[0] = NanNull();
  }
  
  req->callback->Call(1, args);
  delete req;
}

void getAvailableFontsAsync(uv_work_t *work) {
  AsyncRequest *req = (AsyncRequest *) work->data;
  req->results = getAvailableFonts();
}

template<bool async>
NAN_METHOD(getAvailableFonts) {
  NanScope();
  
  if (async) {
    if (args.Length() < 1 || !args[0]->IsFunction())
      return NanThrowTypeError("Expected a callback");
    
    AsyncRequest *req = new AsyncRequest(args[0]);
    uv_queue_work(uv_default_loop(), &req->work, getAvailableFontsAsync, (uv_after_work_cb) asyncCallback);
    
    NanReturnUndefined();
  } else {
    NanReturnValue(collectResults(getAvailableFonts()));
  }
}

void findFontsAsync(uv_work_t *work) {
  AsyncRequest *req = (AsyncRequest *) work->data;
  req->results = findFonts(req->desc);
}

template<bool async>
NAN_METHOD(findFonts) {
  NanScope();
  
  if (args.Length() < 1 || !args[0]->IsObject() || args[0]->IsFunction())
    return NanThrowTypeError("Expected a font descriptor");
  
  Local<Object> desc = args[0].As<Object>();
  FontDescriptor *descriptor = new FontDescriptor(desc);
  
  if (async) {
    if (args.Length() < 2 || !args[1]->IsFunction())
      return NanThrowTypeError("Expected a callback");
    
    AsyncRequest *req = new AsyncRequest(args[1]);
    req->desc = descriptor;
    uv_queue_work(uv_default_loop(), &req->work, findFontsAsync, (uv_after_work_cb) asyncCallback);
    
    NanReturnUndefined();
  } else {
    Local<Object> res = collectResults(findFonts(descriptor));
    delete descriptor;
    NanReturnValue(res);
  }
}

void findFontAsync(uv_work_t *work) {
  AsyncRequest *req = (AsyncRequest *) work->data;
  req->result = findFont(req->desc);
}

template<bool async>
NAN_METHOD(findFont) {  
  NanScope();
  
  if (args.Length() < 1 || !args[0]->IsObject() || args[0]->IsFunction())
    return NanThrowTypeError("Expected a font descriptor");

  Local<Object> desc = args[0].As<Object>();
  FontDescriptor *descriptor = new FontDescriptor(desc);
  
  if (async) {
    if (args.Length() < 2 || !args[1]->IsFunction())
      return NanThrowTypeError("Expected a callback");
    
    AsyncRequest *req = new AsyncRequest(args[1]);
    req->desc = descriptor;
    uv_queue_work(uv_default_loop(), &req->work, findFontAsync, (uv_after_work_cb) asyncCallback);
    
    NanReturnUndefined();
  } else {
    Handle<Value> res = wrapResult(findFont(descriptor));
    delete descriptor;
    NanReturnValue(res);
  }
}

void substituteFontAsync(uv_work_t *work) {
  AsyncRequest *req = (AsyncRequest *) work->data;
  req->result = substituteFont(req->postscriptName, req->substitutionString);
}

template<bool async>
NAN_METHOD(substituteFont) {
  NanScope();
  
  if (args.Length() < 1 || !args[0]->IsString())
    return NanThrowTypeError("Expected postscript name");
  
  if (args.Length() < 2 || !args[1]->IsString())
    return NanThrowTypeError("Expected substitution string");
  
  NanUtf8String postscriptName(args[0]);
  NanUtf8String substitutionString(args[1]);
    
  if (async) {
    if (args.Length() < 3 || !args[2]->IsFunction())
      return NanThrowTypeError("Expected a callback");
    
    // copy the strings since the JS garbage collector might run before the async request is finished
    char *ps = new char[postscriptName.Size() + 1];
    strcpy(ps, *postscriptName);
  
    char *sub = new char[substitutionString.Size() + 1];
    strcpy(sub, *substitutionString);
    
    AsyncRequest *req = new AsyncRequest(args[2]);
    req->postscriptName = ps;
    req->substitutionString = sub;
    uv_queue_work(uv_default_loop(), &req->work, substituteFontAsync, (uv_after_work_cb) asyncCallback);
    
    NanReturnUndefined();
  } else {
    NanReturnValue(wrapResult(substituteFont(*postscriptName, *substitutionString)));
  }
}

void init(Handle<Object> exports) {
  NODE_SET_METHOD(exports, "getAvailableFonts", getAvailableFonts<true>);
  NODE_SET_METHOD(exports, "getAvailableFontsSync", getAvailableFonts<false>);
  NODE_SET_METHOD(exports, "findFonts", findFonts<true>);
  NODE_SET_METHOD(exports, "findFontsSync", findFonts<false>);
  NODE_SET_METHOD(exports, "findFont", findFont<true>);
  NODE_SET_METHOD(exports, "findFontSync", findFont<false>);
  NODE_SET_METHOD(exports, "substituteFont", substituteFont<true>);
  NODE_SET_METHOD(exports, "substituteFontSync", substituteFont<false>);
}

NODE_MODULE(fontmanager, init)
