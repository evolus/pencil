<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0"
    xmlns:p="http://www.evolus.vn/Namespace/Pencil"
    xmlns:html="http://www.w3.org/1999/xhtml"
    xmlns="http://www.w3.org/1999/xhtml"
    exclude-result-prefixes="p html">
<xsl:output method="html" doctype-system="about:legacy-compat"/>

    <!--
        The page tree follows parentPageId. A page whose parent is not part of the export has
        no match in pageById and becomes a root. Links to pages outside the export are dropped
        so every link area leads somewhere.
    -->
    <xsl:key name="pageById" match="p:Page" use="@id"/>
    <xsl:key name="pagesByParent" match="p:Page" use="p:Properties/p:Property[@name='parentPageId']"/>

    <xsl:variable name="documentName" select="/p:Document/p:Properties/p:Property[@name='fileName']/text()"/>
    <xsl:variable name="bitmapScale" select="/p:Document/p:Properties/p:Property[@name='bitmapScale']/text()"/>

    <xsl:template match="/">
        <html lang="en">
            <head>
                <meta charset="utf-8"/>
                <meta name="viewport" content="width=device-width, initial-scale=1"/>
                <title><xsl:value-of select="$documentName"/></title>
                <link rel="stylesheet" href="Resources/style.css"/>
            </head>
            <body>
                <nav class="sidebar" aria-label="Pages">
                    <div class="sidebar-title"><xsl:value-of select="$documentName"/></div>
                    <ul class="page-tree">
                        <xsl:apply-templates select="/p:Document/p:Pages/p:Page[not(key('pageById', p:Properties/p:Property[@name='parentPageId']))]" mode="tree"/>
                    </ul>
                </nav>
                <main class="viewer">
                    <header class="page-bar">
                        <button type="button" class="sidebar-toggle" aria-expanded="false">Pages</button>
                        <ol class="breadcrumb" aria-label="Page path"></ol>
                        <label class="link-toggle">
                            <input type="checkbox" class="link-toggle-input"/>
                            <span>Show clickable areas</span>
                        </label>
                        <div class="page-nav">
                            <a class="page-nav-link" data-step="-1" href="#">Previous</a>
                            <a class="page-nav-link" data-step="1" href="#">Next</a>
                        </div>
                    </header>
                    <div class="page-area">
                        <xsl:apply-templates select="/p:Document/p:Pages/p:Page" mode="page"/>
                    </div>
                </main>
                <script src="Resources/script.js"></script>
            </body>
        </html>
    </xsl:template>

    <xsl:template match="p:Page" mode="tree">
        <xsl:variable name="children" select="key('pagesByParent', @id)"/>
        <li class="tree-item" data-fid="{p:Properties/p:Property[@name='fid']/text()}">
            <div class="tree-row">
                <xsl:choose>
                    <xsl:when test="$children">
                        <button type="button" class="tree-toggle" aria-expanded="true" aria-label="Show or hide child pages"></button>
                    </xsl:when>
                    <xsl:otherwise>
                        <span class="tree-spacer"></span>
                    </xsl:otherwise>
                </xsl:choose>
                <a class="tree-link" href="#{p:Properties/p:Property[@name='fid']/text()}">
                    <xsl:value-of select="p:Properties/p:Property[@name='name']/text()"/>
                </a>
            </div>
            <xsl:if test="$children">
                <ul class="tree-children">
                    <xsl:apply-templates select="$children" mode="tree"/>
                </ul>
            </xsl:if>
        </li>
    </xsl:template>

    <xsl:template match="p:Page" mode="page">
        <section class="page" data-fid="{p:Properties/p:Property[@name='fid']/text()}" hidden="hidden"
            style="--page-width: {p:Properties/p:Property[@name='width']/text()}px">
            <div class="page-frame">
                <img class="page-image" src="{@rasterized}" alt="{p:Properties/p:Property[@name='name']/text()}"
                    style="background-color: {p:Properties/p:Property[@name='backgroundColorRGBA']/text()}"/>
                <xsl:apply-templates select="p:Links/p:Link[key('pageById', @target)]"/>
            </div>
            <xsl:if test="p:Note">
                <div class="page-note">
                    <xsl:apply-templates select="p:Note/node()" mode="processing-notes"/>
                </div>
            </xsl:if>
        </section>
    </xsl:template>

    <!--
        Link geometry is in page units times bitmapScale. The page image can be larger than
        that, because Pencil captures it at the device pixel ratio of its screen, so link areas
        are placed as percentages of the page size, never of the image's pixel size.
    -->
    <xsl:template match="p:Link">
        <xsl:variable name="width" select="../../p:Properties/p:Property[@name='width'] * $bitmapScale"/>
        <xsl:variable name="height" select="../../p:Properties/p:Property[@name='height'] * $bitmapScale"/>
        <a class="link-area" href="#{@targetFid}" title="Go to page '{@targetName}'"
            style="left: {@x div $width * 100}%; top: {@y div $height * 100}%; width: {@w div $width * 100}%; height: {@h div $height * 100}%"></a>
    </xsl:template>

    <xsl:template match="html:*" mode="processing-notes">
        <xsl:copy>
            <xsl:copy-of select="@*[local-name() != '_moz_dirty']"/>
            <xsl:apply-templates mode="processing-notes"/>
        </xsl:copy>
    </xsl:template>
    <xsl:template match="html:a[@page-fid]" mode="processing-notes">
        <xsl:choose>
            <xsl:when test="key('pageById', @page-id)">
                <a href="#{@page-fid}" title="Go to page '{@page-name}'">
                    <xsl:copy-of select="@class|@style"/>
                    <xsl:apply-templates mode="processing-notes"/>
                </a>
            </xsl:when>
            <xsl:otherwise>
                <span>
                    <xsl:copy-of select="@class|@style"/>
                    <xsl:apply-templates mode="processing-notes"/>
                </span>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>
</xsl:stylesheet>
