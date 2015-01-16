

var vocabulary = function(documents) {
    // Vocabulary of unique words (porter stemmed).
    var vocab = [];
    // Vocabulary of unique words in their original form.
    var vocabOrig = {};

    for (var i = 0; i < sentences.length; i++) {
        if (sentences[i] == "") continue;
        documents[i] = [];

        var words = sentences[i].split(/[\s,\"]+/);

        if (!words) continue;
        for (var wc = 0; wc < words.length; wc++) {
            var w = words[wc].toLowerCase().replace(/[^a-z\'A-Z0-9 ]+/g, '');
            var wStemmed = stem(w);
            if (w == "" || w.length == 1 || stop_words.indexOf(w.replace("'", "")) > -1 || w.indexOf("http") == 0) continue;
            if (f[wStemmed]) {
                f[wStemmed] = f[wStemmed] + 1;
            } else if (wStemmed) {
                f[wStemmed] = 1;
                vocab.push(wStemmed);
                vocabOrig[wStemmed] = w;
            }

            documents[i].push(vocab.indexOf(wStemmed));
        }
    }

    return {
        process: function(document) {

        },
        processAll: function(documents) {

        },
        toWord: function(id) {

        },
        toID: function(word) {

        }
    };
};


module.exports = vocabulary;