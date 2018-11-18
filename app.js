(function ($) {
    var app = $.sammy(function () {

        this.get('#', function (context) {
            context.render('/view/puzzleView.html', function(output) {
                $('#container').html(output);
            });
        });

        this.get('#play', function (context) {
            context.render('/view/playEngineView.html', function(output) {
                $('#container').html(output);
            });
        });

        this.get('#puzzle', function (context) {
            context.render('/view/puzzleView.html', function(output) {
                $('#container').html(output);
            });
        });

        this.get('#analyze', function (context) {
            context.render('/view/analyzeView.html', function(output) {
                $('#container').html(output);
            });
        });

        this.get('#analyze/:name', function (context) {
            context.render('/view/analyzeView.html', this.params['name'], function(output) {
                $('#container').html(output);
            });
        });

        this.get('#:unknown', function () {
            console.log("Unknown routing path: " + this.params.unknown);
            this.redirect('#');
        });
    });

    $(function () {
        app.run('#');
    });
})(jQuery);