var localSearchHelper = (function() {
    var transcript;
    var isApi2 = false;

    var localTranscriptSearch = function(transcript, terms, _isApi2) {
        console.time('localSearch');
        isApi2 = _isApi2;
        var data = {
            requestStatus: 'SUCCESS',
            hits: {
                hits: [],
                length: 1
            }
        };
        var transcript_words = transcript;
        var results = [];
        var temp_results = {};
        var posOffset = isApi2 ? 0 : 1;

        // create fuse model
        var fuseEngine = new Fuse(transcript_words, {
            keys: ['w'],
            threshold: 0.2
        });

        var term_phrases = [];
        var term_one_word = [];
        for (var t = 0; t < terms.length; t++) {
            var _term = terms[t];
            if(_term.indexOf('"') === 0 && _term.lastIndexOf('"') === (_term.length - 1)){ // if "many words"
                term_phrases.push(_term);
            }
            else{
                term_one_word.push(_term);
            }
        }

        console.time('fuse');
        for (t = 0; t < term_one_word.length; t++) {
            var one_word = term_one_word[t];
            var fuse_result = fuseEngine.search(one_word);
            for (var r = 0; r < fuse_result.length; r++) {
                var fuse_res_item = fuse_result[r];
                addResultNodeForLocalSearch(transcript, one_word, fuse_res_item, temp_results);
            }
        }
        console.timeEnd('fuse');

        if(term_phrases.length > 0){
            console.time('indexOf');

            for (var j = 0; j < term_phrases.length; j++) {
                var phrase = term_phrases[j];
                phrase = phrase.toLocaleLowerCase().replace(/"/g, "");
                phrase = replaceAndTrim(phrase);
                var inner_words = [];
                phrase.split(/(?=\W)(?=\s)/).forEach(function(inner_term){
                    inner_term = replaceAndTrim(inner_term);
                    if(inner_term !== '') {
                        inner_words.push(inner_term);
                    }
                });
                phrase = inner_words.join(' ');
                if(inner_words.length > 0) {
                    var first_word_result = fuseEngine.search(inner_words[0]);
                    for (var p = 0; p < first_word_result.length; p++) {
                        var word_in = [];
                        var word = '';
                        var phrase_begin_word = first_word_result[p];
                        var term_length = inner_words.length;
                        var num = phrase_begin_word.p - posOffset;
                        for (var k = 0; k < term_length; k++) {
                            var next_word = transcript_words[num];
                            if(next_word){
                                var space = ' ';
                                if(next_word.m == 'punc') {
                                    space = '';
                                    k--;
                                }
                                word += space + replaceAndTrim(next_word.w).toLocaleLowerCase();

                                // compare parts of phrase for increasing speed
                                var part_of_phrase = inner_words.slice(0, k + 1);
                                part_of_phrase = part_of_phrase.join(' ');
                                if(part_of_phrase !== word.trim() && transcript_words[num + 1] && transcript_words[num + 1].m !== 'punc') {
                                    break;
                                }
                            }
                            num++;
                        }

                        if(word.indexOf(phrase) != -1) {
                            word_in.push(phrase);
                        }

                        if(word_in.length > 0) {
                            addResultNodeForLocalSearch(transcript, word_in[0], phrase_begin_word, temp_results);
                        }
                    }
                }
            }
            console.timeEnd('indexOf');
        }

        for (var key in temp_results) {
            data.hits.hits.push({
                term: key,
                hits: temp_results[key]
            });
        }
        console.log("Local search: \n", data);
        console.timeEnd('localSearch');

        return data;
    };

    var addResultNodeForLocalSearch = function(transcript, name, word, results_obj){
        var result_info = {};
        result_info.time = word.s / 1000;
        result_info.phrase = localPhraseByObj(transcript, word, name);
        if(!results_obj[name]){
            results_obj[name] = [];
        }
        results_obj[name].push(result_info);
    };

    var localPhraseByObj = function(transcript, word, term){
        var transcript_words = transcript;
        var pos = word.p;
        var before = 1000;
        var after = 1500;

        var posOffset = isApi2 ? 0 : 1;

        var i = posOffset;
        var before_phrase = '<b>' + transcript_words[pos - posOffset].w + '</b>';
        var tek_word;
        var space;

        while(before > 0){
            tek_word = transcript_words[pos - i];
            var prev_word = transcript_words[pos - 1 - i];
            if(prev_word && prev_word.m != 'turn' && tek_word.m != 'turn'){
                space = (tek_word.m == 'punc') ? '' : ' ';
                before_phrase =  prev_word.w + space + before_phrase;
                before -= (tek_word.s - prev_word.s);
                i++;
            }
            else break;
        }

        i = 1;
        var after_phrase = '';
        while(after > 0){
            tek_word = (i === 1) ? transcript_words[pos - posOffset] : transcript_words[pos - i];
            var next_word = transcript_words[pos - posOffset + i];
            if(next_word && tek_word && next_word.m != 'turn' && tek_word.m != 'turn'){
                space = (next_word.m == 'punc') ? '' : ' ';
                after_phrase =  after_phrase + space;
                if(term.indexOf((tek_word.w + space + next_word.w).toLowerCase()) !== -1 ){
                    after_phrase += '<b>' + next_word.w + '</b>';
                }
                else {
                    after_phrase += next_word.w;
                }
                after -= (next_word.s - tek_word.s);
                i++;
            }
            else break;
        }

        return before_phrase + after_phrase;
    };

    var replaceAndTrim = function(word){
        return word.replace(/<br\s*[\/]?>/gi, "").replace(/\n/gi, "").trim();
    };


    return {
        localTranscriptSearch: localTranscriptSearch,
        addResultNodeForLocalSearch: addResultNodeForLocalSearch,
        localPhraseByObj: localPhraseByObj,
        replaceAndTrim: replaceAndTrim
    };

})();