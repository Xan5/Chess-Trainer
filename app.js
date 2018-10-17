(function ($) {
    var app = $.sammy(function () {

        this.get('#/', function (context) {
            context.render('/view/puzzlePage.template', {
                'myVariable': 'Some value'
            }, function(output) {
                console.log(output);
                $('#container').html(output);
            });
        });

        this.get('#play', function (context) {
            context.render('/view/playEngineView.template', {
                'myVariable': 'Some value'
            }, function(output) {
                console.log(output);
                $('#container').html(output);
            });
        });

        this.get('#puzzle', function (context) {
            context.render('/view/puzzlePage.template', {
                'myVariable': 'Some value'
            }, function(output) {
                console.log(output);
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