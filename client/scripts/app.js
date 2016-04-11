function routerHandler() {

    var $panels = $('[role="panel"]');
    var $menuItems = $('[role="navigation"] li');

    function handleRouteChange() {

        var hash;
        // Default screen management.
        if(window.location.hash.length === 0) {
            hash = "#crud-create";
        } else {
            hash = window.location.hash;
        }

        // Reset panels visibility.
        $panels.hide();

        // Select panel, and show it.
        var $panel = $panels.filter(hash).show();

        // Unselect previously selected item.
        $menuItems.filter('[aria-selected="true"]').attr('aria-selected', false);

        // Mark proper menu item as selected.
        $menuItems.find('[href="' + hash + '"]')
                  .parent()
                  .attr('aria-selected', true);
    }

    window.onpopstate = handleRouteChange;
    handleRouteChange();
}


function createDownloadHandler() {

    var $payload = $('#crud-create .payload pre');
    var $result = $('#crud-create .result');
    var $resultStatus = $result.find(' p.status span');
    var $resultBody = $result.find('pre');
    var $url = $('#create-url');
    var $notify = $('#create-notify');
    var $button = $('#crud-create button');

    function onFieldChange() {
        var payload = {};

        if ($url.val() && $url.val().length > 0) {
            payload.url = $url.val();
        }
        if ($notify[0].checked) {
            payload.notify = true;
        }

        $payload.html(JSON.stringify(payload, null, 2));
    }

    function onSubmit() {

        var payload = $payload.html();
        $result.removeClass('error').removeClass('success');

        $.ajax({
            'method': 'POST',
            'url': 'downloads',
            'data': payload,
            'headers': {
                'content-type': 'application/json'
            },
            'complete': function(xhr, textStatus) {
                $resultStatus.html(xhr.status);

                if (xhr.status !== 201) {
                    $result.addClass('error');
                    $resultBody.html(xhr.responseText);
                } else if (!xhr.responseJSON) {
                    $result.addClass('error');
                    $resultBody.html('The created document is expected in the response');
                } else {
                    $result.addClass('success');
                    var formatted = JSON.stringify(xhr.responseJSON, null, 2);
                    $resultBody.html(formatted);
                }
            }
        });
    }

    $url.keyup(onFieldChange);
    $notify.change(onFieldChange);
    $button.click(onSubmit);
}

function listDownloadHandler() {

    var $result = $('#crud-list .result');
    var $resultStatus = $result.find(' p.status span');
    var $resultBody = $result.find('pre');
    var $button = $('#crud-list button');

    function onSubmit() {

        $result.removeClass('error').removeClass('success');

        $.ajax({
            'method': 'GET',
            'url': 'downloads/',
            'complete': function(xhr, textStatus) {
                $resultStatus.html(xhr.status);

                if (xhr.status !== 200) {
                    $result.addClass('error');
                    $resultBody.html(xhr.responseText);
                } else {
                    $result.addClass('success');
                    var formatted = JSON.stringify(xhr.responseJSON, null, 2);
                    $resultBody.html(formatted);
                }
            }
        });
    }

    $button.click(onSubmit);
}

window.onload = function() {
    routerHandler();
    createDownloadHandler();
    listDownloadHandler();
};
