(function ($) {
    var app = $.sammy(function () {

        this.get('#/', function (context) {
            context.render('/view/puzzleView.html', {
                'myVariable': 'Some value'
            }, function(output) {
                $('#container').html(output);
            });
        });

        this.get('#play', function (context) {
            context.render('/view/playEngineView.html', {
                'myVariable': 'Some value'
            }, function(output) {
                $('#container').html(output);
            });
        });

        this.get('#puzzle', function (context) {
            context.render('/view/puzzleView.html', {
                'myVariable': 'Some value'
            }, function(output) {
                $('#container').html(output);
            });
        });

        this.get('#:unknown', function () {
            alert("Unknown routing path: " + this.params.unknown);

            this.redirect('#welcome');
        });
    });

    $(function () {
        app.run('#welcome');
    });
})(jQuery);