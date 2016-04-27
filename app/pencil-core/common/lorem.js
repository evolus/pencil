/* Lorem Ipsum Generator
Using the The Lorem Ipsum Generator by Fredrik Bridell (http://bridell.com/loremipsum/)
 */

/* Latin words, These are all the words in the first 100 lines of Ovid's Metamorphoses, Liber I. */
var latin =["ab", "aberant", "abscidit", "acervo", "ad", "addidit", "adhuc", "adsiduis", "adspirate", "aequalis", "aer", "aera", "aere", "aeris", "aestu", "aetas", "aethera", "aethere", "agitabilis", "aliis", "aliud", "alta", "altae", "alto", "ambitae", "amphitrite", "animal", "animalia", "animalibus", "animus", "ante", "aquae", "arce", "ardentior", "astra", "aurea", "auroram", "austro", "bene", "boreas", "bracchia", "caeca", "caecoque", "caeleste", "caeli", "caelo", "caelum", "caelumque", "caesa", "calidis", "caligine", "campoque", "campos", "capacius", "carentem", "carmen", "cepit", "certis", "cesserunt", "cetera", "chaos:", "cingebant", "cinxit", "circumdare", "circumfluus", "circumfuso", "coegit", "coeperunt", "coeptis", "coercuit", "cognati", "colebat", "concordi", "congeriem", "congestaque", "consistere", "contraria", "conversa", "convexi", "cornua", "corpora", "corpore", "crescendo", "cum", "cuncta", "cura", "declivia", "dedit", "deducite", "deerat", "dei", "densior", "deorum", "derecti", "descenderat", "deus", "dextra", "di", "dicere", "diffundi", "diremit", "discordia", "dispositam", "dissaepserat", "dissociata", "distinxit", "diu", "diversa", "diverso", "divino", "dixere", "dominari", "duae", "duas", "duris", "effervescere", "effigiem", "egens", "elementaque", "emicuit", "ensis", "eodem", "erant", "erat", "erat:", "erectos", "est", "et", "eurus", "evolvit", "exemit", "extendi", "fabricator", "facientes", "faecis", "fecit", "feras", "fert", "fidem", "figuras", "finxit", "fixo", "flamina", "flamma", "flexi", "fluminaque", "fontes", "foret", "forma", "formaeque", "formas", "fossae", "fratrum", "freta", "frigida", "frigore", "fronde", "fuerant", "fuerat", "fuit", "fulgura", "fulminibus", "galeae", "gentes", "glomeravit", "grandia", "gravitate", "habendum", "habentem", "habentia", "habitabilis", "habitandae", "haec", "hanc", "his", "homini", "hominum", "homo", "horrifer", "humanas", "hunc", "iapeto", "ignea", "igni", "ignotas", "illas", "ille", "illi", "illic", "illis", "imagine", "in", "inclusum", "indigestaque", "induit", "iners", "inmensa", "inminet", "innabilis", "inposuit", "instabilis", "inter", "invasit", "ipsa", "ita", "iudicis", "iuga", "iunctarum", "iussit", "lacusque", "lanient", "lapidosos", "lege", "legebantur", "levitate", "levius", "liberioris", "librata", "ligavit:", "limitibus", "liquidas", "liquidum", "litem", "litora", "locavit", "locis", "locoque", "locum", "longo", "lucis", "lumina", "madescit", "magni", "manebat", "mare", "margine", "matutinis", "mea", "media", "meis", "melior", "melioris", "membra", "mentes", "mentisque", "metusque", "militis", "minantia", "mixta", "mixtam", "moderantum", "modo", "moles", "mollia", "montes", "montibus", "mortales", "motura", "mundi", "mundo", "mundum", "mutastis", "mutatas", "nabataeaque", "nam", "natura", "naturae", "natus", "ne", "nebulas", "nec", "neu", "nisi", "nitidis", "nix", "non", "nondum", "norant", "nova", "nubes", "nubibus", "nullaque", "nulli", "nullo", "nullus", "numero", "nunc", "nuper", "obliquis", "obsistitur", "obstabatque", "occiduo", "omni", "omnia", "onerosior", "onus", "opifex", "oppida", "ora", "orba", "orbe", "orbem", "orbis", "origine", "origo", "os", "otia", "pace", "parte", "partim", "passim", "pendebat", "peragebant", "peregrinum", "permisit", "perpetuum", "persidaque", "perveniunt", "phoebe", "pinus", "piscibus", "plagae", "pluvialibus", "pluviaque", "poena", "pondere", "ponderibus", "pondus", "pontus", "porrexerat", "possedit", "posset:", "postquam", "praebebat", "praecipites", "praeter", "premuntur", "pressa", "prima", "primaque", "principio", "pro", "pronaque", "proxima", "proximus", "pugnabant", "pulsant", "quae", "quam", "quanto", "quarum", "quem", "qui", "quia", "quicquam", "quin", "quinta", "quisque", "quisquis", "quod", "quoque", "radiis", "rapidisque", "recens", "recepta", "recessit", "rectumque", "regat", "regio", "regna", "reparabat", "rerum", "retinebat", "ripis", "rudis", "sanctius", "sata", "satus", "scythiam", "secant", "secrevit", "sectamque", "secuit", "securae", "sed", "seductaque", "semina", "semine", "septemque", "sibi", "sic", "siccis", "sidera", "silvas", "sine", "sinistra", "sive", "sole", "solidumque", "solum", "sorbentur", "speciem", "spectent", "spisso", "sponte", "stagna", "sua", "subdita", "sublime", "subsidere", "sui", "suis", "summaque", "sunt", "super", "supplex", "surgere", "tanta", "tanto", "tegi", "tegit", "tellure", "tellus", "temperiemque", "tempora", "tenent", "tepescunt", "terra", "terrae", "terram", "terrarum", "terras", "terrenae", "terris", "timebat", "titan", "tollere", "tonitrua", "totidem", "totidemque", "toto", "tractu", "traxit", "triones", "tuba", "tum", "tumescere", "turba", "tuti", "ubi", "ulla", "ultima", "umentia", "umor", "unda", "undae", "undas", "undis", "uno", "unus", "usu", "ut", "utque", "utramque", "valles", "ventis", "ventos", "verba", "vesper", "videre", "vindice", "vis", "viseret", "vix", "volucres", "vos", "vultus", "zephyro", "zonae"];

// just switch language like this! You can also do this in a script block on the page.
var loremLang = latin;

/* Characters to end a sentence with. Repeat for frequencies (i.e. most sentences end in a period) */
var endings = "................................??!";

/* randomly returns true with a certain chance (a percentage) */
function chance(percentage){
    return (Math.floor(Math.random() * 100) < percentage);
}

/* capitalizes a word */
function capitalize(aString){
    return aString.substring(0,1).toUpperCase() + aString.substring(1, aString.length);
}

/* returns a random lorem word */
function getLoremWord(){
    return loremLang[Math.floor(Math.random()*loremLang.length)];
}

function getLoremEnding(){
    var i = Math.floor(Math.random()*endings.length);
    return endings.substring(i, i+1);
}

/* inserts a number of lorem words. Does not append a space at the end. */
function loremIpsum(numWords){
    var s = "";
    for(var i=0; i<numWords-1; i++){
        s += getLoremWord() + " ";
    }
    s += getLoremWord();

    return s;
}

/* inserts a sentence of random words. Appends a space at the end. */
function loremIpsumSentence(numWords){
    var s = "";
    s += capitalize(getLoremWord()) + " ";
    s += loremIpsum(numWords-1);
    s += getLoremEnding();
    s += " ";

    return s;
}

/* inserts a sentence of random words, sometimes with extra punctuation. Appends a space at the end. */
function loremIpsumSentence2(numWords){
    var s = "";
    s += capitalize(getLoremWord()) + " ";
    var part1 = 0;
    if(chance(50)){
        // insert a comma or other punctuation within the sentence
        part1 = Math.floor(Math.random() * numWords-2);
        s += loremIpsum(part1);
        s += ", ";
    } else {
        s += " ";
    }
    s += loremIpsum(numWords - part1 - 1);
    s += getLoremEnding();
    s += " ";

    return s;
}

/* inserts a paragraph of sentences of random words. */
function loremIpsumParagraph(numWords){
    var s = "";
    var words = numWords;
    while(words > 0){
        if(words > 10){
            w = Math.floor(Math.random() * 8) + 2;
            s += loremIpsumSentence2(w);
            words = words - w;
        } else {
            s += loremIpsumSentence2(words);
            words = 0;
        }
    }

    return s;
}
