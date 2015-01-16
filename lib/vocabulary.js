var stem = require('stem-porter');

var vocabulary = function(sentences) {
    // Vocabulary of unique words (porter stemmed).
    var vocab = [];

    // Vocabulary of unique words in their original form.
    var vocabOrig = {};

    // Index-encoded array of sentences, with each row containing the indices of the words in the vocabulary.
    var docs = [];

    // Hash of vocabulary words and the count of how many times each word has been seen.
    var f = {};

    for (var i = 0; i < sentences.length; i++) {
        if (sentences[i] == "") continue;
        docs[i] = [];

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

            docs[i].push(vocab.indexOf(wStemmed));
        }
    }

    return {
        words: function() { return vocab; },
        documents: function() { return docs; },
        length: function() { return vocab.length; },
//        process: function(document) {
//
//        },
//        processAll: function(documents) {
//
//        },
        toWord: function(id) {
            return vocab[id];
        },
        toOriginalWord: function(id) {
            return vocabOrig[id];
        },
        toID: function(word) {
            return vocab.indexOf(word);
        }
    };
};


module.exports = vocabulary;