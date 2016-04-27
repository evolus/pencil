<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0"
    xmlns="http://www.w3.org/2000/svg"
    xmlns:p="http://www.evolus.vn/Namespace/Pencil"
    xmlns:pencil="http://www.evolus.vn/Namespace/Pencil"
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
    xmlns:em="http://exslt.org/math"
    xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd"
    xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape">
    
    <xsl:output method="xml"/>

    <xsl:template match="/">
        <svg width="744.09448819" height="1052.3622047"
            id="exportedSVG"
            version="1.1"
            pencil:version="1.2.2"
            sodipodi:docname="{/p:Document/p:Properties/p:Property[@name='fileName']/text()}">
            
            <xsl:apply-templates select="/p:Document/p:Pages/p:Page" />
            
        </svg>
    </xsl:template>
    <xsl:template match="p:Page">
        <g inkscape:label="{p:Properties/p:Property[@name='name']/text()}"
           inkscape:groupmode="layer" id="layer_{p:Properties/p:Property[@name='fid']/text()}">
            <g>
                <rect x="0" y="0"
                    width="{p:Properties/p:Property[@name='width']/text()}"
                    height="{p:Properties/p:Property[@name='width']/text()}">
                    <xsl:choose>
                        <xsl:when test="p:Properties/p:Property[@name='transparentBackground']/text() = 'false'">
                            <xsl:attribute name="fill"><xsl:value-of select="substring(p:Properties/p:Property[@name='backgroundColor']/text(), 1, 7)"/></xsl:attribute>
                        </xsl:when>
                        <xsl:otherwise>
                            <xsl:attribute name="fill">none</xsl:attribute>
                        </xsl:otherwise>
                    </xsl:choose>
                </rect>
                <xsl:apply-templates select="p:Content/*" mode="copy" />
            </g>
        </g>
    </xsl:template>
    <xsl:template mode="copy" match="*">
        <xsl:copy-of select="."/>
    </xsl:template>
</xsl:stylesheet>
