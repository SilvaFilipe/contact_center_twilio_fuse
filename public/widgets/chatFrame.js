(function () {
    var div = document.createElement("div");
    document.getElementsByTagName('body')[0].appendChild(div);
    div.outerHTML = "<div id='botDiv' style='border: 1px solid #2743b0; right: 0; height: 20px; position: fixed; bottom: 0; z-index: 1000'><div id='botTitleBar' style='background-color: #2743b0; color:white; height: 20px; width: 400px; position:fixed; cursor: pointer;'>Live Chat &#9656; </div><iframe width='400px' height='600px' src=chatFrameUrl></iframe></div>";

    document.querySelector('body').addEventListener('click', function (e) {
        e.target.matches = e.target.matches || e.target.msMatchesSelector;
        if (e.target.matches('#botTitleBar')) {
            var botDiv = document.querySelector('#botDiv');
            if (botDiv.style.height == '600px') {
                botDiv.style.height ='20px';
                document.getElementById('botTitleBar').innerHTML='Live Chat &#9656;';
            } else {
                botDiv.style.height ='600px';
                document.getElementById('botTitleBar').innerHTML='Live Chat &#9662;';
            }
//            botDiv.style.height = botDiv.style.height == '600px' ? '38px' : '600px';

        };
    });
}());
