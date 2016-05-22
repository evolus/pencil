<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0"
    xmlns="http://www.w3.org/1999/xhtml"
    xmlns:p="http://www.evolus.vn/Namespace/Pencil"
    xmlns:html="http://www.w3.org/1999/xhtml"
    xmlns:xhtml="http://www.w3.org/1999/xhtml"
    xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
    xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
    xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
    xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"
    xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"
    xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"
    xmlns:xlink="http://www.w3.org/1999/xlink"
    xmlns:dc="http://purl.org/dc/elements/1.1/"
    xmlns:meta="urn:oasis:names:tc:opendocument:xmlns:meta:1.0"
    xmlns:number="urn:oasis:names:tc:opendocument:xmlns:datastyle:1.0"
    xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0"
    xmlns:chart="urn:oasis:names:tc:opendocument:xmlns:chart:1.0"
    xmlns:dr3d="urn:oasis:names:tc:opendocument:xmlns:dr3d:1.0"
    xmlns:math="http://www.w3.org/1998/Math/MathML"
    xmlns:form="urn:oasis:names:tc:opendocument:xmlns:form:1.0"
    xmlns:script="urn:oasis:names:tc:opendocument:xmlns:script:1.0"
    xmlns:ooo="http://openoffice.org/2004/office"
    xmlns:ooow="http://openoffice.org/2004/writer"
    xmlns:oooc="http://openoffice.org/2004/calc"
    xmlns:dom="http://www.w3.org/2001/xml-events"
    xmlns:xforms="http://www.w3.org/2002/xforms"
    xmlns:xsd="http://www.w3.org/2001/XMLSchema"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xmlns:rpt="http://openoffice.org/2005/report"
    xmlns:of="urn:oasis:names:tc:opendocument:xmlns:of:1.2"
    xmlns:rdfa="http://docs.oasis-open.org/opendocument/meta/rdfa#"
    xmlns:field="urn:openoffice:names:experimental:ooo-ms-interop:xmlns:field:1.0"
    xmlns:regexp="http://exslt.org/regular-expressions"
    xmlns:em="http://exslt.org/math">

    <xsl:output method="xml"/>

    <xsl:template match="/">

<office:document-content office:version="1.2">
    <office:automatic-styles>
        <style:style style:name="P1" style:family="paragraph" style:parent-style-name="Heading_20_1"></style:style><style:style style:name="T1" style:family="text"><style:text-properties fo:font-weight="bold" style:font-weight-asian="bold" style:font-weight-complex="bold"/></style:style><style:style style:name="fr1" style:family="graphic" style:parent-style-name="Graphics"><style:graphic-properties style:vertical-pos="top" style:vertical-rel="paragraph" style:mirror="none" fo:clip="rect(0in, 0in, 0in, 0in)" draw:luminance="0%" draw:contrast="0%" draw:red="0%" draw:green="0%" draw:blue="0%" draw:gamma="100%" draw:color-inversion="false" draw:image-opacity="100%" draw:color-mode="standard"/><style:paragraph-properties fo:break-after="page"/></style:style>
        

       <style:style style:name="Tsuper" style:family="text">
           <style:text-properties style:text-position="super 58%"/>
       </style:style>
       <style:style style:name="Tsub" style:family="text">
           <style:text-properties style:text-position="sub 58%"/>
       </style:style>

       <style:style style:name="Pol" style:family="paragraph" style:parent-style-name="Standard" style:list-style-name="L1">
           <style:text-properties style:text-position="0% 100%"/>
       </style:style>

       <style:style style:name="Table1" style:family="table">
           <style:table-properties style:width="16.999cm" table:align="margins"/>
       </style:style>
       <style:style style:name="Table1.A" style:family="table-column">
           <style:table-column-properties style:column-width="5.666cm" style:rel-column-width="21845*"/>
       </style:style>
       <style:style style:name="Table1.A1" style:family="table-cell">
           <style:table-cell-properties fo:padding="0.097cm" fo:border="0.002cm solid #000000" />
       </style:style>

       <style:style style:name="Tbold" style:family="text">
           <style:text-properties fo:font-weight="bold" style:font-weight-asian="bold"  style:font-weight-complex="bold"/>
       </style:style>
       <style:style style:name="Titalics" style:family="text">
           <style:text-properties fo:font-style="italic"  style:font-style-asian="italic" style:font-style-complex="italic"/>
       </style:style>
       <style:style style:name="Punderline" style:family="text">
           <style:text-properties style:text-underline-style="solid" style:text-underline-width="auto" style:text-underline-color="font-color" fo:font-weight="normal" style:font-weight-asian="normal" style:font-weight-complex="normal"/>
       </style:style>
       <text:list-style style:name="LO">
           <text:list-level-style-number text:level="1" text:style-name="Numbering_20_Symbols" style:num-suffix="." style:num-format="1">
               <style:list-level-properties text:space-before="0.635cm" text:min-label-width="0.635cm"/>
           </text:list-level-style-number>
           <text:list-level-style-number text:level="2" text:style-name="Numbering_20_Symbols" style:num-suffix="." style:num-format="1">
               <style:list-level-properties text:space-before="1.27cm" text:min-label-width="0.635cm"/>
           </text:list-level-style-number>
           <text:list-level-style-number text:level="3" text:style-name="Numbering_20_Symbols" style:num-suffix="." style:num-format="1">
               <style:list-level-properties text:space-before="1.905cm" text:min-label-width="0.635cm"/>
           </text:list-level-style-number>
           <text:list-level-style-number text:level="4" text:style-name="Numbering_20_Symbols" style:num-suffix="." style:num-format="1">
               <style:list-level-properties text:space-before="2.54cm" text:min-label-width="0.635cm"/>
           </text:list-level-style-number>
           <text:list-level-style-number text:level="5" text:style-name="Numbering_20_Symbols" style:num-suffix="." style:num-format="1">
               <style:list-level-properties text:space-before="3.175cm" text:min-label-width="0.635cm"/>
           </text:list-level-style-number>
           <text:list-level-style-number text:level="6" text:style-name="Numbering_20_Symbols" style:num-suffix="." style:num-format="1">
               <style:list-level-properties text:space-before="3.81cm" text:min-label-width="0.635cm"/>
           </text:list-level-style-number>
           <text:list-level-style-number text:level="7" text:style-name="Numbering_20_Symbols" style:num-suffix="." style:num-format="1">
               <style:list-level-properties text:space-before="4.445cm" text:min-label-width="0.635cm"/>
           </text:list-level-style-number>
           <text:list-level-style-number text:level="8" text:style-name="Numbering_20_Symbols" style:num-suffix="." style:num-format="1">
               <style:list-level-properties text:space-before="5.08cm" text:min-label-width="0.635cm"/>
           </text:list-level-style-number>
           <text:list-level-style-number text:level="9" text:style-name="Numbering_20_Symbols" style:num-suffix="." style:num-format="1">
               <style:list-level-properties text:space-before="5.715cm" text:min-label-width="0.635cm"/>
           </text:list-level-style-number>
           <text:list-level-style-number text:level="10" text:style-name="Numbering_20_Symbols" style:num-suffix="." style:num-format="1">
               <style:list-level-properties text:space-before="6.35cm" text:min-label-width="0.635cm"/>
           </text:list-level-style-number>
       </text:list-style>
       <text:list-style style:name="LU">
           <text:list-level-style-bullet text:level="1" text:style-name="Bullet_20_Symbols" style:num-suffix="." text:bullet-char="●">
               <style:list-level-properties text:space-before="0.635cm" text:min-label-width="0.635cm"/>
               <style:text-properties style:font-name="StarSymbol"/>
           </text:list-level-style-bullet>
           <text:list-level-style-bullet text:level="2" text:style-name="Bullet_20_Symbols" style:num-suffix="." text:bullet-char="○">
               <style:list-level-properties text:space-before="1.27cm" text:min-label-width="0.635cm"/>
               <style:text-properties style:font-name="StarSymbol"/>
           </text:list-level-style-bullet>
           <text:list-level-style-bullet text:level="3" text:style-name="Bullet_20_Symbols" style:num-suffix="." text:bullet-char="■">
               <style:list-level-properties text:space-before="1.905cm" text:min-label-width="0.635cm"/>
               <style:text-properties style:font-name="StarSymbol"/>
           </text:list-level-style-bullet>
           <text:list-level-style-bullet text:level="4" text:style-name="Bullet_20_Symbols" style:num-suffix="." text:bullet-char="●">
               <style:list-level-properties text:space-before="2.54cm" text:min-label-width="0.635cm"/>
               <style:text-properties style:font-name="StarSymbol"/>
           </text:list-level-style-bullet>
           <text:list-level-style-bullet text:level="5" text:style-name="Bullet_20_Symbols" style:num-suffix="." text:bullet-char="○">
               <style:list-level-properties text:space-before="3.175cm" text:min-label-width="0.635cm"/>
               <style:text-properties style:font-name="StarSymbol"/>
           </text:list-level-style-bullet>
           <text:list-level-style-bullet text:level="6" text:style-name="Bullet_20_Symbols" style:num-suffix="." text:bullet-char="■">
               <style:list-level-properties text:space-before="3.81cm" text:min-label-width="0.635cm"/>
               <style:text-properties style:font-name="StarSymbol"/>
           </text:list-level-style-bullet>
           <text:list-level-style-bullet text:level="7" text:style-name="Bullet_20_Symbols" style:num-suffix="." text:bullet-char="●">
               <style:list-level-properties text:space-before="4.445cm" text:min-label-width="0.635cm"/>
               <style:text-properties style:font-name="StarSymbol"/>
           </text:list-level-style-bullet>
           <text:list-level-style-bullet text:level="8" text:style-name="Bullet_20_Symbols" style:num-suffix="." text:bullet-char="○">
               <style:list-level-properties text:space-before="5.08cm" text:min-label-width="0.635cm"/>
               <style:text-properties style:font-name="StarSymbol"/>
           </text:list-level-style-bullet>
           <text:list-level-style-bullet text:level="9" text:style-name="Bullet_20_Symbols" style:num-suffix="." text:bullet-char="■">
               <style:list-level-properties text:space-before="5.715cm" text:min-label-width="0.635cm"/>
               <style:text-properties style:font-name="StarSymbol"/>
           </text:list-level-style-bullet>
           <text:list-level-style-bullet text:level="10" text:style-name="Bullet_20_Symbols" style:num-suffix="." text:bullet-char="●">
               <style:list-level-properties text:space-before="6.35cm" text:min-label-width="0.635cm"/>
               <style:text-properties style:font-name="StarSymbol"/>
           </text:list-level-style-bullet>
       </text:list-style>
        
        
        
</office:automatic-styles><office:body><office:text text:use-soft-page-breaks="true"><text:sequence-decls><text:sequence-decl text:display-outline-level="0" text:name="Illustration"/><text:sequence-decl text:display-outline-level="0" text:name="Table"/><text:sequence-decl text:display-outline-level="0" text:name="Text"/><text:sequence-decl text:display-outline-level="0" text:name="Drawing"/></text:sequence-decls>
    <text:p text:style-name="DocumentTitle">
        <xsl:value-of select="/p:Document/p:Properties/p:Property[@name='fileName']/text()"/>
    </text:p>

    <xsl:apply-templates select="/p:Document/p:Pages/p:Page" />

</office:text></office:body></office:document-content>

    </xsl:template>

    <xsl:template match="p:Page">
        <xsl:variable name="pw" select="7"/>
        <xsl:variable name="ph" select="9.5"/>
        <xsl:variable name="dpi" select="96"/>

        <xsl:variable name="w" select="number(p:Properties/p:Property[@name='width']/text())"/>
        <xsl:variable name="h" select="number(p:Properties/p:Property[@name='height']/text())"/>
        <xsl:variable name="win" select="$w div $dpi"/>
        <xsl:variable name="hin" select="$h div $dpi"/>

        <xsl:variable name="rw" select="$win div $pw"/>
        <xsl:variable name="rh" select="$hin div $ph"/>

        <text:h text:style-name="P1" text:outline-level="1">
            <text:bookmark text:name="{p:Properties/p:Property[@name='fid']/text()}_page"/>
            <xsl:value-of select="p:Properties/p:Property[@name='name']/text()"/>
        </text:h>
        
        <xsl:if test="p:Note">
            <text:section text:name="NoteSection">
                <xsl:apply-templates select="p:Note/node()"/>
                <text:p></text:p>
            </text:section>
        </xsl:if>

        <text:p text:style-name="Text_20_body">
            <draw:frame draw:style-name="fr1" draw:name="graphics_{p:Properties/p:Property[@name='fid']/text()}" text:anchor-type="char" draw:z-index="0">
                <xsl:choose>
                    <xsl:when test="$win &lt; $pw and $hin &lt; $ph">
                        <xsl:attribute name="svg:width"><xsl:value-of select="$win"/>in</xsl:attribute>
                        <xsl:attribute name="svg:height"><xsl:value-of select="$hin"/>in</xsl:attribute>
                    </xsl:when>
                    <xsl:otherwise>
                        <xsl:choose>
                            <xsl:when test="$rw &lt; $rh">
                                <xsl:attribute name="svg:width"><xsl:value-of select="$win div $rh"/>in</xsl:attribute>
                                <xsl:attribute name="svg:height"><xsl:value-of select="$hin div $rh"/>in</xsl:attribute>
                            </xsl:when>
                            <xsl:otherwise>
                                <xsl:attribute name="svg:width"><xsl:value-of select="$win div $rw"/>in</xsl:attribute>
                                <xsl:attribute name="svg:height"><xsl:value-of select="$hin div $rw"/>in</xsl:attribute>
                            </xsl:otherwise>
                        </xsl:choose>
                    </xsl:otherwise>
                </xsl:choose>
                <draw:image xlink:href="{@rasterized}" xlink:type="simple" xlink:show="embed" xlink:actuate="onLoad"/>
                <xsl:if test="p:Links/p:Link">
                    <draw:image-map>
                        <xsl:apply-templates select="p:Links/p:Link" />
                    </draw:image-map>
                </xsl:if>

            </draw:frame>
        </text:p>
    </xsl:template>
    <xsl:template match="p:Link">
        <xsl:variable name="dpi" select="96"/>
        <draw:area-rectangle xlink:href="#{@targetFid}_page" xlink:type="simple" office:target-frame-name="_self" xlink:show="replace" svg:x="{number(@x) div $dpi}in" svg:y="{number(@y) div $dpi}in" svg:width="{number(@w) div $dpi}in" svg:height="{number(@h) div $dpi}in">
            <svg:title><xsl:value-of select="@targetName"/></svg:title>
        </draw:area-rectangle>
    </xsl:template>
    
   <xsl:template match="xhtml:div">
       <xsl:apply-templates/>
   </xsl:template>
   
   <xsl:template match="xhtml:b">
       <text:span text:style-name="Tbold">
           <xsl:apply-templates/>
       </text:span>
   </xsl:template>

   <xsl:template match="xhtml:i">
     <text:span text:style-name="Titalics">
       <xsl:apply-templates/>
     </text:span>
   </xsl:template>

   <xsl:template match="xhtml:sub">
     <text:span text:style-name="Tsub">
       <xsl:apply-templates/>
     </text:span>
   </xsl:template>

   <xsl:template match="xhtml:sup">
     <text:span text:style-name="Tsuper">
       <xsl:apply-templates/>
     </text:span>
   </xsl:template>

   <xsl:template match="xhtml:u">
       <text:span text:style-name="Punderline">
           <xsl:apply-templates/>
       </text:span>
   </xsl:template>

   <xsl:template match="xhtml:p">
       <text:p>
       <xsl:apply-templates/>
       </text:p>
   </xsl:template>

   <xsl:template match="xhtml:h1">
       <text:h text:outline-level='1'>
       <xsl:apply-templates/>
       </text:h>
   </xsl:template>

   <xsl:template match="xhtml:h2">
       <text:h text:outline-level='2'>
       <xsl:apply-templates/>
       </text:h>
   </xsl:template>

   <xsl:template match="xhtml:h3">
       <text:h text:outline-level='3'>
       <xsl:apply-templates/>
       </text:h>
   </xsl:template>

   <xsl:template match="xhtml:h4">
       <text:h text:outline-level='4'>
       <xsl:apply-templates/>
       </text:h>
   </xsl:template>

   <xsl:template match="xhtml:ul">
       <text:list text:style-name="LU">
       <xsl:apply-templates/>
       </text:list>
   </xsl:template>

   <xsl:template match="xhtml:ol">
     <text:list text:style-name="LO">
       <xsl:apply-templates/>
     </text:list>
   </xsl:template>

   <xsl:template match="xhtml:li">
       <text:list-item><text:p text:style-name="L1">
       <xsl:apply-templates/>
       </text:p></text:list-item>
   </xsl:template>

   <xsl:template match="xhtml:table">
       <table:table table:name="Table1" table:style-name="Table1">
       <table:table-column table:style-name="Table1.A" table:number-columns-repeated="{count(tr[position() = 1]/td | tr[position() = 1]/th)}"/>
           <xsl:apply-templates/>
       </table:table>
   </xsl:template>

   <xsl:template match="xhtml:tr[xhtml:th]">
       <table:table-header-rows><table:table-row>
           <xsl:apply-templates/>
       </table:table-row></table:table-header-rows>
   </xsl:template>

    <xsl:template match="xhtml:th">
       <table:table-cell table:style-name="Table1.A1">
       <xsl:apply-templates/>
       </table:table-cell>
   </xsl:template>

   <xsl:template match="xhtml:td">
       <table:table-cell table:style-name="Table1.A1">
       <xsl:apply-templates/>
       </table:table-cell>
   </xsl:template>

   <xsl:template match="xhtml:tr">
       <table:table-row>
           <xsl:apply-templates/>
       </table:table-row>
   </xsl:template>

   <xsl:template match="xhtml:a">
       <text:a xlink:href="{@href}">
           <xsl:apply-templates/>
       </text:a>
   </xsl:template>

   <xsl:template match="xhtml:img">
       <draw:frame draw:style-name="fr1" draw:name="graphics1" text:anchor-type="paragraph" svg:x="{@width}" svg:y="{@height}" svg:width="{@width}" svg:height="{@height}" draw:z-index="0">
       <draw:image xlink:href="{@src}" xlink:type="simple" xlink:show="embed" xlink:actuate="onLoad">
           <xsl:apply-templates/>
       </draw:image>
       </draw:frame>
   </xsl:template>
</xsl:stylesheet>
