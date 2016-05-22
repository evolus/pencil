  /**
   * SAXParser()
   *
   * This is the constuctor
   */

  function SAXParser()
  {
    this.doc = false;
    this.handler = false;
    this.str = "";
    this.cname = new Array();
    this.curr = 0;
    this.notToBeParsed_CDATA = { running: false, value: "" };
  }

  /**
   * setDocumentHandler(aHandler)
   *
   * aHandler is the Javascript handler described above to handle
   * the parsing.
   *
   */

  SAXParser.prototype.setDocumentHandler = function(aHandler)
  {
    this.handler = aHandler;
  }

  /**
   * parse(aData)
   *
   * aData is the data that you what parsed.  This can be in
   * chunks or whole.
   *
   */

  SAXParser.prototype.parse = function(aData)
  {
    this.str += aData;

    if(this.handler == false)
    { // code exceptions :)
      return;
    }

    if(!this.doc)
    { // strip prolog
      var start = this.str.indexOf("<");
      if(this.str.substring(start,start + 3) == "<?x" || this.str.substring(start,start + 3) == "<?X" )
      {
        var close = this.str.indexOf("?>");
        if(close == -1)
        {
          return;
        }
        this.str = this.str.substring(close + 2,this.str.length);
      }
      this.handler.startDocument();
      this.doc = true;
    }

    // keep circling and eating the str
    while(1)
    {
      //dump("str: "+this.str+"\n");
      // coffee break
      if(this.str.length == 0)
      {
        return;
      }

      // check if we are in <![CDATA[ mode
      if (this.notToBeParsed_CDATA.running) {
        var CDATA_end = this.str.indexOf("]]>");
        if ( CDATA_end == -1) {
          this.notToBeParsed_CDATA.string += this.str;
          this.str = "";
          continue;
        } else {
          this.notToBeParsed_CDATA.string += this.str.substring(0, CDATA_end);
          this.str = this.str.substring(CDATA_end + 3, this.str.length);
          this.notToBeParsed_CDATA.running = false;
          this.handler.characters(this.notToBeParsed_CDATA.string);
          this.notToBeParsed_CDATA.string = "";
          continue;
        }
      }

      // then check for closes
      var eclose = this.str.indexOf("</" + this.cname[this.curr] + ">");
      if(eclose == 0)
      {
        this.str = this.str.substring(this.cname[this.curr].length + 3, this.str.length);
        this.handler.endElement(this.cname[this.curr])
          this.curr--;
        if(this.curr == 0)
        {
          this.doc = false;
          this.handler.endDocument();
          return;
        }
        continue;
      }

      // check for <![CDATA[ start
      if (this.str.indexOf("<![CDATA[") == 0) {
        this.notToBeParsed_CDATA.running = true;
        this.notToBeParsed_CDATA.string = "";
        this.str = this.str.substring(9, this.str.length);
        continue;
      }

      // check last for tags
      var estart = this.str.indexOf("<");
      if(estart == 0)
      { // new element
        close = this.indexEndElement(this.str);
        if(close == -1)
        {
          return;
        }
        var empty = (this.str.substring(close - 1,close) == "/");
        if(empty)
        {
          var starttag = this.str.substring(1,close - 1);
        }else{
          starttag = this.str.substring(1,close);
        }
        var nextspace = starttag.indexOf(" ");
        var attribs = new String();
        var name = new String();
        if(nextspace != -1)
        {
          name = starttag.substring(0,nextspace);
          attribs = starttag.substring(nextspace + 1,starttag.length);
        }else{
          name = starttag;
        }

        this.handler.startElement(name, this.attribution(attribs));

        if(empty)
        {
          this.handler.endElement(name);
        }else{
          this.curr++;
          this.cname[this.curr] = name;
        }

        this.str = this.str.substring(close + 1,this.str.length);
        continue;
      }

      // leftovers are cdata
      if(estart == -1)
      {
        this.handler.characters(this.entityCheck(this.str));
        this.str = "";
      }else{
        this.handler.characters(this.entityCheck(this.str.substring(0,estart)));
        this.str = this.str.substring(estart,this.str.length);
      }
    }
  }

  /**
   * indexEndElement(aStr)
   *
   * Internal function used to determing the index of the end of
   * the tag.
   *
   * Returns the index or -1 if there is no close to the tag
   *
   */

  SAXParser.prototype.indexEndElement = function(aStr)
  {
    var eq = sp = gt = 0;

    sp = aStr.indexOf(" ");
    gt = aStr.indexOf(">");
    if(sp < gt) {
      if(sp == -1) {
        return gt;
      }
      if(aStr.charAt(sp+1) == ">")
      {
        return sp;
      }
    } else {
      return gt;
    }

    var end = 0;

    // we didn't so we keep collecting attributes.
    while(1)
    {
      //dump("in indexEndElement\n");
      eq = aStr.indexOf("=", end);
      id = aStr.charAt(eq+1);
      end = aStr.indexOf(id, eq+2);
      if(aStr.charAt(end+1) == "/" && aStr.charAt(end+2) == ">") {
        return end+2;
      }
      if(aStr.charAt(end+1) == ">") {
        return end+1;
      }
      end = end+1;
    }
    return end;
  }

  /**
   * attribution(aStr)
   *
   * Internal function used to determing the different attributes
   * in a tag.
   *
   * Returns the list of attributes in the tag
   *
   */

  SAXParser.prototype.attribution = function(aStr)
  {
    var attribs = new Array();
    var ids = new Number();
    var eq = id1 = id2 = nextid = val = key = new String();

    while(1)
    {
      //dump("in attribution\n");
      eq = aStr.indexOf("=");
      if(aStr.length == 0 || eq == -1)
      {
        return attribs;
      }

      id1 = aStr.indexOf("'");
      id2 = aStr.indexOf('"');
      if((id1 < id2 && id1 != -1) || id2 == -1)
      {
        ids = id1;
        id = "'";
      }
      if((id2 < id1 || id1 == -1) && id2 != -1)
      {
        ids = id2;
        id = '"';
      }

      nextid = aStr.indexOf(id,ids + 1);
      val = aStr.substring(ids + 1,nextid);
      key = aStr.substring(0,eq);

      // strip whitespace
      ws = key.split("\n");
      key = ws.join("");
      ws = key.split(" ");
      key = ws.join("");
      ws = key.split("\t");
      key = ws.join("");

      attribs[key] = this.entityCheck(val);
      aStr = aStr.substring(nextid + 1,aStr.length);
    }

    return attribs;
  }

  /**
   * entityCheck(aStr)
   *
   * Internal function used to replace entitys with there character
   * equivalent.
   *
   * Returns the modified string.
   *
   */

  SAXParser.prototype.entityCheck = function(aStr)
  {
    var A = new Array();

    A = aStr.split("&lt;");
    aStr = A.join("<");
    A = aStr.split("&gt;");
    aStr = A.join(">");
    A = aStr.split("&quot;");
    aStr = A.join("\"");
    A = aStr.split("&apos;");
    aStr = A.join("\'");
    A = aStr.split("&amp;");
    aStr = A.join("&");

    return aStr;
  }
