<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0"
    xmlns:p="http://www.evolus.vn/Namespace/Pencil"
    xmlns:html="http://www.w3.org/1999/xhtml"
    xmlns="http://www.w3.org/1999/xhtml">
<xsl:output method="xml"/>

<xsl:param name="format" select="'vector'" />
<xsl:param name="pageSize" select="'a4'" />
<xsl:param name="orientation" select="'portrait'" />
<xsl:param name="cols" select="2" />
<xsl:param name="rows" select="2" />
<xsl:param name="space" select="5" />
<xsl:param name="marginType" select="'normal'" />
<xsl:param name="withPageName" select="'true'" />
<xsl:param name="withHeaderFooter" select="'true'" />
<xsl:param name="withPageNote" select="'true'" />
<xsl:param name="pageNotePadding" select="3" />
<xsl:param name="headerFooterFontSize" select="2" />
<xsl:param name="pageNameFontSize" select="4" />
<xsl:param name="withBorder" select="'true'" />

<xsl:variable name="paperWidth">
    <xsl:choose>
        <xsl:when test="$pageSize = 'a3'">
            <xsl:choose><xsl:when test="$orientation = 'portrait'">297</xsl:when><xsl:otherwise>420</xsl:otherwise></xsl:choose>
        </xsl:when>
        <xsl:when test="$pageSize = 'a4'">
            <xsl:choose><xsl:when test="$orientation = 'portrait'">210</xsl:when><xsl:otherwise>297</xsl:otherwise></xsl:choose>
        </xsl:when>
        <xsl:when test="$pageSize = 'a5'">
            <xsl:choose><xsl:when test="$orientation = 'portrait'">148</xsl:when><xsl:otherwise>210</xsl:otherwise></xsl:choose>
        </xsl:when>
        <xsl:when test="$pageSize = 'tabloid'">
            <xsl:choose><xsl:when test="$orientation = 'portrait'">279</xsl:when><xsl:otherwise>432</xsl:otherwise></xsl:choose>
        </xsl:when>
        <xsl:when test="$pageSize = 'legal'">
            <xsl:choose><xsl:when test="$orientation = 'portrait'">216</xsl:when><xsl:otherwise>356</xsl:otherwise></xsl:choose>
        </xsl:when>
        <xsl:when test="$pageSize = 'letter'">
            <xsl:choose><xsl:when test="$orientation = 'portrait'">216</xsl:when><xsl:otherwise>279</xsl:otherwise></xsl:choose>
        </xsl:when>
        <xsl:when test="$pageSize = 'half-letter'">
            <xsl:choose><xsl:when test="$orientation = 'portrait'">140</xsl:when><xsl:otherwise>216</xsl:otherwise></xsl:choose>
        </xsl:when>
    </xsl:choose>
</xsl:variable>
<xsl:variable name="paperHeight">
    <xsl:choose>
        <xsl:when test="$pageSize = 'a3'">
            <xsl:choose><xsl:when test="$orientation = 'landscape'">295</xsl:when><xsl:otherwise>418</xsl:otherwise></xsl:choose>
        </xsl:when>
        <xsl:when test="$pageSize = 'a4'">
            <xsl:choose><xsl:when test="$orientation = 'landscape'">208</xsl:when><xsl:otherwise>295</xsl:otherwise></xsl:choose>
        </xsl:when>
        <xsl:when test="$pageSize = 'a5'">
            <xsl:choose><xsl:when test="$orientation = 'landscape'">146</xsl:when><xsl:otherwise>208</xsl:otherwise></xsl:choose>
        </xsl:when>
        <xsl:when test="$pageSize = 'tabloid'">
            <xsl:choose><xsl:when test="$orientation = 'landscape'">277</xsl:when><xsl:otherwise>430</xsl:otherwise></xsl:choose>
        </xsl:when>
        <xsl:when test="$pageSize = 'legal'">
            <xsl:choose><xsl:when test="$orientation = 'landscape'">214</xsl:when><xsl:otherwise>354</xsl:otherwise></xsl:choose>
        </xsl:when>
        <xsl:when test="$pageSize = 'letter'">
            <xsl:choose><xsl:when test="$orientation = 'portrait'">214</xsl:when><xsl:otherwise>277</xsl:otherwise></xsl:choose>
        </xsl:when>
        <xsl:when test="$pageSize = 'half-letter'">
            <xsl:choose><xsl:when test="$orientation = 'portrait'">138</xsl:when><xsl:otherwise>214</xsl:otherwise></xsl:choose>
        </xsl:when>
    </xsl:choose>
</xsl:variable>
<xsl:variable name="pageMarginFactor">
    <xsl:choose>
        <xsl:when test="$marginType = 'none'">0</xsl:when>
        <xsl:when test="$marginType = 'large'">0.1</xsl:when>
        <xsl:otherwise>0.05</xsl:otherwise>
    </xsl:choose>
</xsl:variable>
<xsl:variable name="pageMargin">
    <xsl:choose>
        <xsl:when test="$paperWidth > $paperHeight"><xsl:value-of select="round($paperHeight * $pageMarginFactor)" /></xsl:when>
        <xsl:otherwise><xsl:value-of select="round($paperWidth * $pageMarginFactor)" /></xsl:otherwise>
    </xsl:choose>
</xsl:variable>
<xsl:variable name="headerFooterHeight">
    <xsl:choose>
        <xsl:when test="$withHeaderFooter = 'true'"><xsl:value-of select="round($headerFooterFontSize * 2)" /></xsl:when>
        <xsl:otherwise>0</xsl:otherwise>
    </xsl:choose>
</xsl:variable>
<xsl:variable name="pageWidth" select="$paperWidth - 2 * $pageMargin" />
<xsl:variable name="pageHeight" select="$paperHeight - 2 * ($pageMargin - $headerFooterHeight)" />
<xsl:variable name="sheetsPerPage" select="$cols * $rows" />
<xsl:variable name="blockWidth" select="floor(($pageWidth - ($cols - 1) * $space) div $cols)" />
<xsl:variable name="blockHeight" select="floor((($pageHeight - 2 * $headerFooterHeight) - ($rows - 1) * $space) div $rows)" />
<xsl:variable name="pageNameHeight">
    <xsl:choose>
        <xsl:when test="$withPageName = 'true'"><xsl:value-of select="round($pageNameFontSize * 1.5)" /></xsl:when>
        <xsl:otherwise>0</xsl:otherwise>
    </xsl:choose>
</xsl:variable>
<xsl:variable name="calculatedPageNotePadding">
    <xsl:choose>
        <xsl:when test="$withPageNote = 'true'"><xsl:value-of select="pageNotePadding" /></xsl:when>
        <xsl:otherwise>0</xsl:otherwise>
    </xsl:choose>
</xsl:variable>
<xsl:variable name="imageWidth" select="$blockWidth" />
<xsl:variable name="imageHeight" select="$blockHeight - $pageNameHeight - $calculatedPageNotePadding" />

<xsl:key name="pageById" match="p:Page" use="@id"/>

    <xsl:template match="/">
        <html>
            <head>
                <title>
                    <xsl:value-of select="/p:Document/p:Properties/p:Property[@name='friendlyName']/text()"/> - <xsl:value-of select="$blockWidth" /> x <xsl:value-of select="$blockHeight" />
                </title>
                <style type="text/css">
                        @page {
                            size: <xsl:value-of select="$pageSize"/><xsl:text> </xsl:text><xsl:value-of select="$orientation"/>;
                            margin: <xsl:value-of select="$pageMargin - $headerFooterHeight"/>mm <xsl:value-of select="$pageMargin"/>mm 0mm <xsl:value-of select="$pageMargin"/>mm;
                        }

                        body {
                            margin: 0px;
                            padding: 0px;
                            font-family: "Liberation Sans", Arial, sans-serif;
                            font-size: 3mm;
                        }

                        body > .Page {
                            page-break-inside: avoid;
                            display: inline-block;
                            width: <xsl:value-of select="$blockWidth"/>mm;
                            height: <xsl:value-of select="$blockHeight"/>mm;
                            overflow: hidden;
                        }

                        body > .Page:not(.RowIndex0) {
                            margin-top: <xsl:value-of select="$space"/>mm;
                        }
                        body > .Page:not(.ColIndex0) {
                            margin-left: <xsl:value-of select="$space"/>mm;
                        }

                        body > .Page > .SVGContainer {
                            display: inline-block;
                            width: <xsl:value-of select="$imageWidth"/>mm;
                            height: <xsl:value-of select="$imageHeight"/>mm;
                            box-sizing: border-box;
                            overflow: hidden;
                            <xsl:if test="$withBorder = 'true'">
                                border: solid 0.1mm #333;
                            </xsl:if>
                        }
                        body > .Page > .SVGContainerInner {
                            overflow: hidden;
                        }
                        body > .Page > .SVGContainer > .Notes {
                            width: <xsl:value-of select="$imageWidth - 1"/>mm;
                            box-sizing: border-box;
                            padding: <xsl:value-of select="$calculatedPageNotePadding"/>mm;
                            padding-bottom: 0mm;
                            overflow: hidden;
                            text-overflow: ellipsis;
                            font-size: 2.5mm;
                            line-height: 1.3;
                        }

                        body > .Page > .SVGContainer > svg {
                            display: inline-block;
                        }

                        body > .Header,
                        body > .Footer {
                            font-size: <xsl:value-of select="$headerFooterFontSize" />mm;
                            height: <xsl:value-of select="$headerFooterFontSize" />mm;
                            line-height: <xsl:value-of select="$headerFooterFontSize" />mm;
                            padding-bottom: <xsl:value-of select="$headerFooterHeight - $headerFooterFontSize" />mm;
                            box-sizing: content-box;
                            text-align: center;
                            width: <xsl:value-of select="$pageWidth" />mm;
                            <xsl:if test="$withHeaderFooter = 'false'">
                                visibility: hidden;
                            </xsl:if>
                        }
                        body > .Footer {
                            text-align: left;
                            padding-bottom: 0mm;
                            page-break-inside: avoid;
                            page-break-before: avoid;
                            padding-top: <xsl:value-of select="$headerFooterHeight - $headerFooterFontSize" />mm;
                        }
                        body > .Footer.HasMore_true {
                            /* page-break-after: always; */
                        }

                        body > .Page > .PageName {
                            font-size: <xsl:value-of select="$pageNameFontSize" />mm;
                            height: <xsl:value-of select="$pageNameFontSize" />mm;
                            line-height: <xsl:value-of select="$pageNameFontSize" />mm;
                            text-align: left;
                            margin: 0mm;
                            padding: 0mm;
                            padding-bottom: <xsl:value-of select="$pageNameHeight - $pageNameFontSize" />mm;
                            box-sizing: content-box;
                            font-weight: bold;
                        }
                </style>
            </head>
            <body>
                <pre style="display: none; position: absolute; color: #fff; top: 10em; left: 0px;">
                    paperSize = <xsl:value-of select="$paperWidth" />mm x <xsl:value-of select="$paperHeight" />mm
                    pageSize = <xsl:value-of select="$pageWidth" />mm x <xsl:value-of select="$pageHeight" />mm
                    margin: <xsl:value-of select="$pageMargin - $headerFooterHeight"/>mm <xsl:value-of select="$pageMargin"/>mm <xsl:value-of select="$pageMargin - $headerFooterHeight"/>mm <xsl:value-of select="$pageMargin"/>mm;
                    blockSize = <xsl:value-of select="$blockWidth" />mm x <xsl:value-of select="$blockHeight" />mm
                    imageSize = <xsl:value-of select="$imageWidth" />mm x <xsl:value-of select="$imageHeight" />mm
                </pre>
                <xsl:apply-templates select="/p:Document/p:Pages/p:Page" />
            </body>
        </html>
    </xsl:template>
    <xsl:template match="p:Page">
        <xsl:if test="((position() mod $sheetsPerPage) = 1)">
            <div class="Header"><xsl:value-of select="/p:Document/p:Properties/p:Property[@name='friendlyName']/text()"/></div>
        </xsl:if>
        <div class="Page SheetIndex{position() mod $sheetsPerPage} ColIndex{(position() - 1) mod $cols} RowIndex{floor(((position() - 1) mod $sheetsPerPage) div $cols)}" id="{p:Properties/p:Property[@name='fid']/text()}_page">
            <xsl:if test="$withPageName = 'true'">
                <div class="PageName"><xsl:value-of select="p:Properties/p:Property[@name='name']/text()"/></div>
            </xsl:if>
            <div class="SVGContainer" style="overflow: hidden;">
                <div class="SVGContainerInner">
                    <xsl:call-template name="calculateSVGSize">
                        <xsl:with-param name="width" select="p:Properties/p:Property[@name='width']/text()" />
                        <xsl:with-param name="height" select="p:Properties/p:Property[@name='height']/text()" />
                    </xsl:call-template>
                    <xsl:choose>
                        <xsl:when test="$format = 'vector'">
                            <svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"
                                viewBox="0 0 {p:Properties/p:Property[@name='width']/text()} {p:Properties/p:Property[@name='height']/text()}">
                                <xsl:call-template name="calculateSVGSize">
                                    <xsl:with-param name="width" select="p:Properties/p:Property[@name='width']/text()" />
                                    <xsl:with-param name="height" select="p:Properties/p:Property[@name='height']/text()" />
                                </xsl:call-template>
                                <rect x="0" y="0"
                                        width="{p:Properties/p:Property[@name='width']/text()}"
                                        height="{p:Properties/p:Property[@name='height']/text()}"
                                        stroke="none" fill="{p:Properties/p:Property[@name='backgroundColorRGBA']/text()}">
                                </rect>
                                <xsl:apply-templates select="p:BackgroundPages/p:Page" mode="copyBackground"/>
                                <g inkscape:label="{p:Properties/p:Property[@name='name']/text()}"
                                   inkscape:groupmode="layer" id="layer_{p:Properties/p:Property[@name='fid']/text()}">
                                    <xsl:apply-templates select="p:Content/*" mode="copy" />
                                </g>
                            </svg>
                        </xsl:when>
                        <xsl:otherwise>
                            <div>
                                <xsl:call-template name="calculateImageSize">
                                    <xsl:with-param name="width" select="p:Properties/p:Property[@name='width']/text()" />
                                    <xsl:with-param name="height" select="p:Properties/p:Property[@name='height']/text()" />
                                </xsl:call-template>
                                <img src="{@rasterized}"
                                    style="width: 100%; height: 100%;"
                                    usemap="#map_{p:Properties/p:Property[@name='fid']/text()}"/>
                            </div>
                            <map name="map_{p:Properties/p:Property[@name='fid']/text()}">
                                <xsl:apply-templates select="p:Links/p:Link" />
                            </map>
                        </xsl:otherwise>
                    </xsl:choose>
                </div>
                <xsl:if test="p:Note and $withPageNote = 'true'">
                    <div class="Notes">
                        <xsl:call-template name="calculateNoteHeight">
                            <xsl:with-param name="width" select="p:Properties/p:Property[@name='width']/text()" />
                            <xsl:with-param name="height" select="p:Properties/p:Property[@name='height']/text()" />
                        </xsl:call-template>
                        <xsl:apply-templates select="p:Note/node()" mode="processing-notes"/>
                    </div>
                </xsl:if>
            </div>
        </div>
        <xsl:if test="((position() mod $sheetsPerPage) = 0 or position() = last())">
            <div class="Footer HasMore_{position() &lt; last()}">Exported from Pencil - <xsl:value-of select="/p:Document/p:Properties/p:Property[@name='exportTime']/text()"/> - Page <xsl:value-of select="floor((position() - 1) div $sheetsPerPage) + 1" /> of <xsl:value-of select="floor((last() - 1) div $sheetsPerPage) + 1" /></div>
        </xsl:if>
    </xsl:template>
    <xsl:template name="calculateSVGSize">
        <xsl:param name="width" />
        <xsl:param name="height" />
        <xsl:choose>
            <xsl:when test="$marginType = 'none'">
                <xsl:attribute name="width"><xsl:value-of select="$paperWidth" />mm</xsl:attribute>
                <xsl:attribute name="height"><xsl:value-of select="$paperHeight" />mm</xsl:attribute>
            </xsl:when>
            <xsl:when test="($height div $imageHeight) > ($width div $imageWidth)">
                <xsl:attribute name="width"><xsl:value-of select="($width div ($height div $imageHeight))" />mm</xsl:attribute>
                <xsl:attribute name="height"><xsl:value-of select="$imageHeight" />mm</xsl:attribute>
            </xsl:when>
            <xsl:otherwise>
                <xsl:attribute name="width"><xsl:value-of select="$imageWidth" />mm</xsl:attribute>
                <xsl:attribute name="height"><xsl:value-of select="($height div ($width div $imageWidth))" />mm</xsl:attribute>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>
    <xsl:template name="debugSize">
        <xsl:param name="width" />
        <xsl:param name="height" />
        <pre style="position: absolute; color: #fff; top: 20em; left: 0px;">
            svgWidth: <xsl:value-of select="$width" />
            svgHeight: <xsl:value-of select="$height" />
             -
            <xsl:choose>
                <xsl:when test="($height div $imageHeight) > ($width div $imageWidth)">
                    <xsl:value-of select="floor($width div ($height div $imageHeight))" />mm x <xsl:value-of select="$imageHeight" />mm
                </xsl:when>
                <xsl:otherwise>
                    <xsl:value-of select="$imageWidth" />mm x <xsl:value-of select="floor($height div ($width div $imageWidth))" />mm
                </xsl:otherwise>
            </xsl:choose>
        </pre>
    </xsl:template>
    <xsl:template name="calculateImageSize">
        <xsl:param name="width" />
        <xsl:param name="height" />
        <xsl:choose>
            <xsl:when test="($height div $imageHeight) > ($width div $imageWidth)">
                <xsl:attribute name="style">width: <xsl:value-of select="ceiling($width div ($height div $imageHeight))" />mm; height:<xsl:value-of select="$imageHeight" />mm;</xsl:attribute>
            </xsl:when>
            <xsl:otherwise>
                <xsl:attribute name="style">width: <xsl:value-of select="$imageWidth" />mm; height: <xsl:value-of select="ceiling($height div ($width div $imageWidth))" />mm;</xsl:attribute>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>
    <xsl:template name="calculateNoteHeight">
        <xsl:param name="width" />
        <xsl:param name="height" />
        <xsl:choose>
            <xsl:when test="($height div $imageHeight) > ($width div $imageWidth)">
                <xsl:attribute name="style">display: none;</xsl:attribute>
            </xsl:when>
            <xsl:otherwise>
                <xsl:attribute name="style">height: <xsl:value-of select="$imageHeight - 1 - floor($height div ($width div $imageWidth))" />mm;</xsl:attribute>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>
    <xsl:template mode="copyBackground" match="p:Page">
        <g>
            <xsl:apply-templates select="p:Content/*" mode="copy" />
        </g>
    </xsl:template>
    <xsl:template mode="copy" match="*">
        <xsl:copy-of select="."/>
    </xsl:template>
    <xsl:template match="p:Link">
        <area shape="rect"
            coords="{@x},{@y},{@x+@w},{@y+@h}" href="#{@targetFid}_page" title="Go to page '{@targetName}'"/>
    </xsl:template>
    <xsl:template match="html:*" mode="processing-notes">
        <xsl:copy>
            <xsl:copy-of select="@*[local-name() != '_moz_dirty']"/>
            <xsl:apply-templates mode="processing-notes"/>
        </xsl:copy>
    </xsl:template>
    <xsl:template match="html:a[@page-fid]" mode="processing-notes">
        <a href="#{@page-fid}_page" title="Go tp page '{@page-name}'">
            <xsl:copy-of select="@class|@style"/>
            <xsl:apply-templates mode="processing-notes"/>
        </a>
    </xsl:template>
</xsl:stylesheet>
