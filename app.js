(function ($) {
    var app = $.sammy(function () {
        
        this.get('#playai', function (context) {
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
            this.redirect('#playai');
        });
    });

    $(function () {
        app.run('#playai');
    });
})(jQuery);