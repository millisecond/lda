require('./stopwords.js');

//
// Based on javascript implementation https://github.com/awaisathar/lda.js
// Original code based on http://www.arbylon.net/projects/LdaGibbsSampler.java
//
var process = function (vocab, documents, numberOfTopics, alphaValue, betaValue) {
    var V = vocab.length();
    var M = documents.length;
    var K = parseInt(numberOfTopics);
    var alpha = alphaValue || 0.1;  // per-document distributions over topics
    var beta = betaValue || .01;  // per-topic distributions over words

    lda.configure(documents, V, 10000, 2000, 100, 10);
    lda.gibbs(K, alpha, beta);

    return lda;
};

function makeArray(x) {
    var a = [];
    for (var i = 0; i < x; i++) {
        a[i] = 0;
    }
    return a;
}

function make2DArray(x, y) {
    var a = [];
    for (var i = 0; i < x; i++) {
        a[i] = [];
        for (var j = 0; j < y; j++)
            a[i][j] = 0;
    }
    return a;
}

var lda = new function () {
    var documents, z, nw, nd, nwsum, ndsum, thetasum, phisum, V, K, alpha, beta;
    var THIN_INTERVAL = 20;
    var BURN_IN = 100;
    var ITERATIONS = 1000;
    var SAMPLE_LAG;
    var dispcol = 0;
    var numstats = 0;

    this.configure = function (docs, v, iterations, burnIn, thinInterval, sampleLag) {
        this.ITERATIONS = iterations;
        this.BURN_IN = burnIn;
        this.THIN_INTERVAL = thinInterval;
        this.SAMPLE_LAG = sampleLag;
        this.documents = docs;
        this.V = v;
        this.dispcol = 0;
        this.numstats = 0;
    };

    this.initialState = function (K) {
        var i;
        var M = this.documents.length;
        this.nw = make2DArray(this.V, K);
        this.nd = make2DArray(M, K);
        this.nwsum = makeArray(K);
        this.ndsum = makeArray(M);
        this.z = [];
        for (i = 0; i < M; i++) this.z[i] = [];
        for (var m = 0; m < M; m++) {
            var N = this.documents[m].length;
            this.z[m] = [];
            for (var n = 0; n < N; n++) {
                var topic = parseInt("" + (Math.random() * K));
                this.z[m][n] = topic;
                this.nw[this.documents[m][n]][topic]++;
                this.nd[m][topic]++;
                this.nwsum[topic]++;
            }
            this.ndsum[m] = N;
        }
    };

    this.printState = function (K) {
        console.log("z", this.z);
        console.log("nw", this.nw);
        console.log("nd", this.nd);
        console.log("nwsum", this.nwsum);
        console.log("ndsum", this.ndsum);
        console.log("thetasum", this.thetasum);
        console.log("phisum", this.phisum);
        console.log("V", this.V);
        console.log("K", this.K);
    };

    this.topics = function(vocab, numberOfTermsPerTopic) {
        var result = [];

        var theta = this.getTheta();
        var phi = this.getPhi();

        var text = '';

        //topics
        var topTerms = numberOfTermsPerTopic;
        for (var k = 0; k < phi.length; k++) {
            var things = [];
            for (var w = 0; w < phi[k].length; w++) {
                things.push("" + phi[k][w].toPrecision(2) + "_" + vocab.toWord(w) + "_" + vocab.toOriginalWord(vocab.toWord(w)));
            }
            things.sort().reverse();
            //console.log(things);
            if (topTerms > vocab.length()) topTerms = vocab.length();

            //console.log('Topic ' + (k + 1));
            var row = [];

            for (var t = 0; t < topTerms; t++) {
                var topicTerm = things[t].split("_")[2];
                var prob = parseInt(things[t].split("_")[0] * 100);
                if (prob < 2) continue;

                //console.log('Top Term: ' + topicTerm + ' (' + prob + '%)');

                var term = {};
                term.term = topicTerm;
                term.probability = parseFloat(things[t].split("_")[0]);
                row.push(term);
            }

            result.push(row);
        }
        return result;
    };

    this.gibbs = function (K, alpha, beta) {
        var i;
        this.K = K;
        this.alpha = alpha;
        this.beta = beta;
        if (this.SAMPLE_LAG > 0) {
            this.thetasum = make2DArray(this.documents.length, this.K);
            this.phisum = make2DArray(this.K, this.V);
            this.numstats = 0;
        }
        this.initialState(K);
        //document.write("Sampling " + this.ITERATIONS
        //   + " iterations with burn-in of " + this.BURN_IN + " (B/S="
        //   + this.THIN_INTERVAL + ").<br/>");
        for (i = 0; i < this.ITERATIONS; i++) {
            for (var m = 0; m < this.z.length; m++) {
                for (var n = 0; n < this.z[m].length; n++) {
                    var topic = this.sampleFullConditional(m, n);
                    this.z[m][n] = topic;
                }
            }
            if ((i < this.BURN_IN) && (i % this.THIN_INTERVAL == 0)) {
                //document.write("B");
                this.dispcol++;
            }
            if ((i > this.BURN_IN) && (i % this.THIN_INTERVAL == 0)) {
                //document.write("S");
                this.dispcol++;
            }
            if ((i > this.BURN_IN) && (this.SAMPLE_LAG > 0) && (i % this.SAMPLE_LAG == 0)) {
                this.updateParams();
                //document.write("|");
                if (i % this.THIN_INTERVAL != 0)
                    this.dispcol++;
            }
            if (this.dispcol >= 100) {
                //document.write("*<br/>");
                this.dispcol = 0;
            }
        }
    };

    this.sampleFullConditional = function (m, n) {
        var topic = this.z[m][n];
        this.nw[this.documents[m][n]][topic]--;
        this.nd[m][topic]--;
        this.nwsum[topic]--;
        this.ndsum[m]--;
        var p = makeArray(this.K);
        for (var k = 0; k < this.K; k++) {
            p[k] = (this.nw[this.documents[m][n]][k] + this.beta) / (this.nwsum[k] + this.V * this.beta)
                * (this.nd[m][k] + this.alpha) / (this.ndsum[m] + this.K * this.alpha);
        }
        for (var k = 1; k < p.length; k++) {
            p[k] += p[k - 1];
        }
        var u = Math.random() * p[this.K - 1];
        for (topic = 0; topic < p.length; topic++) {
            if (u < p[topic])
                break;
        }
        this.nw[this.documents[m][n]][topic]++;
        this.nd[m][topic]++;
        this.nwsum[topic]++;
        this.ndsum[m]++;
        return topic;
    };

    this.updateParams = function () {
        for (var m = 0; m < this.documents.length; m++) {
            for (var k = 0; k < this.K; k++) {
                this.thetasum[m][k] += (this.nd[m][k] + this.alpha) / (this.ndsum[m] + this.K * this.alpha);
            }
        }
        for (var k = 0; k < this.K; k++) {
            for (var w = 0; w < this.V; w++) {
                this.phisum[k][w] += (this.nw[w][k] + this.beta) / (this.nwsum[k] + this.V * this.beta);
            }
        }
        this.numstats++;
    };

    this.getTheta = function () {
        var theta = [];
        for (var i = 0; i < this.documents.length; i++) theta[i] = [];
        if (this.SAMPLE_LAG > 0) {
            for (var m = 0; m < this.documents.length; m++) {
                for (var k = 0; k < this.K; k++) {
                    theta[m][k] = this.thetasum[m][k] / this.numstats;
                }
            }
        } else {
            for (var m = 0; m < this.documents.length; m++) {
                for (var k = 0; k < this.K; k++) {
                    theta[m][k] = (this.nd[m][k] + this.alpha) / (this.ndsum[m] + this.K * this.alpha);
                }
            }
        }
        return theta;
    };

    this.getPhi = function () {
        var phi = [];
        for (var i = 0; i < this.K; i++) phi[i] = [];
        if (this.SAMPLE_LAG > 0) {
            for (var k = 0; k < this.K; k++) {
                for (var w = 0; w < this.V; w++) {
                    phi[k][w] = this.phisum[k][w] / this.numstats;
                }
            }
        } else {
            for (var k = 0; k < this.K; k++) {
                for (var w = 0; w < this.V; w++) {
                    phi[k][w] = (this.nw[w][k] + this.beta) / (this.nwsum[k] + this.V * this.beta);
                }
            }
        }
        return phi;
    };
};

module.exports = process;