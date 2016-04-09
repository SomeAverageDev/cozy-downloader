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


function createDebtHandler() {

    var $payload = $('#crud-create .payload pre');
    var $result = $('#crud-create .result');
    var $resultStatus = $result.find(' p.status span');
    var $resultBody = $result.find('pre');
    var $description = $('#create-description');
    var $amount = $('#create-amount');
    var $dueDate = $('#create-duedate');
    var $creditor = $('#create-creditor');
    var $button = $('#crud-create button');

    function onFieldChange() {
        var payload = {};

        if ($description.val() && $description.val().length > 0) {
            payload.description = $description.val();
        }

        if ($amount.val() && $amount.val().length > 0) {
            payload.amount = $amount.val();
        }

        if ($dueDate.val() && $dueDate.val().length > 0) {
            payload.dueDate = $dueDate.val();
        }

        if ($creditor.val() && $creditor.val().length > 0) {
            payload.creditor = $creditor.val();
        }

        $payload.html(JSON.stringify(payload, null, 2));
    }

    function onSubmit() {

        var payload = $payload.html();
        $result.removeClass('error').removeClass('success');

        $.ajax({
            'method': 'POST',
            'url': '/debts',
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
                    $resultBody.html('The created document is expected in ' +
                                     'the response');
                } else {
                    $result.addClass('success');
                    var formatted = JSON.stringify(xhr.responseJSON, null, 2);
                    $resultBody.html(formatted);
                }
            }
        });
    }

    $description.keyup(onFieldChange);
    $amount.keyup(onFieldChange);
    $dueDate.keyup(onFieldChange);
    $creditor.keyup(onFieldChange);
    $button.click(onSubmit);
}

function fetchDebtHandler() {

    var $result = $('#crud-fetch .result');
    var $resultStatus = $result.find(' p.status span');
    var $resultBody = $result.find('pre');
    var $id = $('#fetch-id');
    var $button = $('#crud-fetch button');

    function onSubmit() {

        var id = $id.val();
        $result.removeClass('error').removeClass('success');

        if (!id) {
            $result.addClass('error');
            $resultStatus.html('');
            $resultBody.html('ID is a mandatory field.');
            return;
        }

        $.ajax({
            'method': 'GET',
            'url': '/debts/' + id,
            'complete': function(xhr, textStatus) {
                $resultStatus.html(xhr.status);

                if (xhr.status === 404) {
                    $result.addClass('success');
                    $resultBody.html('If the ID is not related to a document' +
                                     ', an error code should be returned');
                } else if (xhr.status !== 200) {
                    $result.addClass('error');
                    $resultBody.html(xhr.responseText);
                } else if (!xhr.responseJSON) {
                    $result.addClass('error');
                    $resultBody.html('The document is expected in the ' +
                                     'response, or the status code should ' +
                                     'be 404');
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

function updateDebtHandler() {

    var $payload = $('#crud-update .payload pre');
    var $result = $('#crud-update .result');
    var $resultStatus = $result.find(' p.status span');
    var $resultBody = $result.find('pre');
    var $description = $('#update-description');
    var $amount = $('#update-amount');
    var $dueDate = $('#update-duedate');
    var $creditor = $('#update-creditor');
    var $id = $('#update-id');
    var $button = $('#crud-update button');

    function onFieldChange() {
        var payload = {};

        if ($description.val() && $description.val().length > 0) {
            payload.description = $description.val();
        }

        if ($amount.val() && $amount.val().length > 0) {
            payload.amount = $amount.val();
        }

        if ($dueDate.val() && $dueDate.val().length > 0) {
            payload.dueDate = $dueDate.val();
        }

        if ($creditor.val() && $creditor.val().length > 0) {
            payload.creditor = $creditor.val();
        }

        $payload.html(JSON.stringify(payload));
    }

    function onSubmit() {

        var payload = $payload.html();
        var id = $id.val();
        $result.removeClass('error').removeClass('success');

        if (!id) {
            $result.addClass('error');
            $resultStatus.html('');
            $resultBody.html('ID is a mandatory field.');
            return;
        }

        $.ajax({
            'method': 'PUT',
            'url': '/debts/' + id,
            'data': payload,
            'headers': {
                'content-type': 'application/json'
            },
            'complete': function(xhr, textStatus) {
                $resultStatus.html(xhr.status);

                if (xhr.status === 404) {
                    $result.addClass('success');
                    $resultBody.html('If the ID is not related to a document' +
                                     ', an error code should be returned');
                } else if (xhr.status !== 200) {
                    $result.addClass('error');
                    $resultBody.html(xhr.responseText);
                } else if (!xhr.responseJSON) {
                    $result.addClass('error');
                    $resultBody.html('The updated document is expected in ' +
                                     'the response, or the status code ' +
                                     'should be 404');
                } else {
                    $result.addClass('success');
                    var formatted = JSON.stringify(xhr.responseJSON, null, 2);
                    $resultBody.html(formatted);
                }
            }
        });
    }

    $description.keyup(onFieldChange);
    $amount.keyup(onFieldChange);
    $dueDate.keyup(onFieldChange);
    $creditor.keyup(onFieldChange);
    $button.click(onSubmit);
}

function deleteDebtHandler() {

    var $result = $('#crud-delete .result');
    var $resultStatus = $result.find(' p.status span');
    var $resultBody = $result.find('pre');
    var $id = $('#delete-id');
    var $button = $('#crud-delete button');

    function onSubmit() {

        var id = $id.val();
        $result.removeClass('error').removeClass('success');

        if (!id) {
            $result.addClass('error');
            $resultStatus.html('');
            $resultBody.html('ID is a mandatory field.');
            return;
        }

        $.ajax({
            'method': 'DELETE',
            'url': '/debts/' + id,
            'complete': function(xhr, textStatus) {
                $resultStatus.html(xhr.status);

                if (xhr.status === 404) {
                    $result.addClass('success');
                    $resultBody.html('If the ID is not related to a document' +
                                     ', an error code should be returned');
                } else if (xhr.status !== 204) {
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

function listDebtHandler() {

    var $result = $('#crud-list .result');
    var $resultStatus = $result.find(' p.status span');
    var $resultBody = $result.find('pre');
    var $button = $('#crud-list button');

    function onSubmit() {

        $result.removeClass('error').removeClass('success');

        $.ajax({
            'method': 'GET',
            'url': '/debts/',
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
    createDebtHandler();
    fetchDebtHandler();
    updateDebtHandler();
    deleteDebtHandler();
    listDebtHandler();
};
