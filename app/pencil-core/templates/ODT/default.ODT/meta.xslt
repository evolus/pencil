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
    
<office:document-meta office:version="1.2">
    <office:meta>
        <meta:initial-creator>Duong Thanh An</meta:initial-creator>
        <meta:creation-date>2009-11-25T11:47:51</meta:creation-date>
        <dc:date>2009-11-25T15:32:53</dc:date>
        <dc:creator>Duong Thanh An</dc:creator>
        <meta:editing-duration>PT03H26M31S</meta:editing-duration>
        <meta:editing-cycles>11</meta:editing-cycles>
        <meta:generator>Evolus Pencil</meta:generator>
        <dc:description>Document generated from a Pencil drawing</dc:description>
        <dc:title><xsl:value-of select="/p:Document/p:Properties/p:Property[@name='fileName']/text()"/></dc:title>
        <meta:document-statistic meta:table-count="0"
            meta:image-count="1" meta:object-count="0" meta:page-count="3"
            meta:paragraph-count="4" meta:word-count="154" meta:character-count="1138" />
    </office:meta>
</office:document-meta>

    </xsl:template>
</xsl:stylesheet>
