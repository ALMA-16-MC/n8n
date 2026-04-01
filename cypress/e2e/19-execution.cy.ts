import { clickGetBackToCanvas, getNdvContainer, getOutputTableRow } from '../composables/ndv';
import {
	clickExecuteWorkflowButton,
	getExecuteWorkflowButton,
	getNodeByName,
	getZoomToFitButton,
	openNode,
} from '../composables/workflow';

import { SCHEDULE_TRIGGER_NODE_NAME, EDIT_FIELDS_SET_NODE_NAME } from '../constants';
import { NDV, WorkflowExecutionsTab, WorkflowPage as WorkflowPageClass } from '../pages';
import { clearNotifications, errorToast, successToast } from '../pages/notifications';

const workflowPage = new WorkflowPageClass();
const executionsTab = new WorkflowExecutionsTab();
const ndv = new NDV();

describe('Execution', () => {
	beforeEach(() => {
		workflowPage.actions.visit();
	});

	it('should test manual workflow', () => {
		cy.createFixtureWorkflow('Manual_wait_set.json');

		workflowPage.getters.executeWorkflowButton().should('be.visible');
		workflowPage.getters.clearExecutionDataButton().should('not.exist');

		workflowPage.getters.zoomToFitButton().click();
		workflowPage.getters.executeWorkflowButton().click();

		workflowPage.getters.executeWorkflowButton().get('.n8n-spinner').should('be.visible');
		workflowPage.getters.stopExecutionButton().should('be.visible');

		workflowPage.getters
			.canvasNodeByName('Manual')
			.within(() => cy.get('svg[data-icon=node-success]'))
			.should('exist');

		cy.wait(2000);

		workflowPage.getters
			.canvasNodeByName('Wait')
			.within(() => cy.get('svg[data-icon=node-success]'))
			.should('exist');

		workflowPage.getters
			.canvasNodeByName('Set')
			.within(() => cy.get('svg[data-icon=node-success]'))
			.should('exist');

		successToast().should('be.visible');
		clearNotifications();

		workflowPage.getters.clearExecutionDataButton().click();
		workflowPage.getters.clearExecutionDataButton().should('not.exist');
	});

	it('should test manual workflow stop', () => {
		cy.createFixtureWorkflow('Manual_wait_set.json');

		workflowPage.getters.zoomToFitButton().click();
		workflowPage.getters.executeWorkflowButton().click();

		workflowPage.getters.stopExecutionButton().should('exist');
		workflowPage.getters.stopExecutionButton().click();

		workflowPage.getters
			.canvasNodeByName('Manual')
			.within(() => cy.get('svg[data-icon=node-success]'))
			.should('exist');

		successToast().should('be.visible');

		workflowPage.getters.clearExecutionDataButton().click();
		workflowPage.getters.clearExecutionDataButton().should('not.exist');
	});

	it('should test webhook workflow', () => {
		cy.createFixtureWorkflow('Webhook_wait_set.json');

		workflowPage.getters.zoomToFitButton().click();
		workflowPage.getters.executeWorkflowButton().click();

		workflowPage.getters.stopExecutionWaitingForWebhookButton().should('be.visible');

		workflowPage.getters.canvasNodes().first().dblclick();
		ndv.getters.copyInput().click();

		cy.grantBrowserPermissions('clipboardReadWrite', 'clipboardSanitizedWrite');

		ndv.getters.backToCanvas().click();

		cy.readClipboard().then((url) => {
			cy.request({
				method: 'GET',
				url,
			}).then((resp) => {
				expect(resp.status).to.eq(200);
			});
		});

		successToast().should('be.visible');
		clearNotifications();

		workflowPage.getters.clearExecutionDataButton().click();
	});

	describe('execution preview', () => {
		it('when deleting the last execution, it should show empty state', () => {
			workflowPage.actions.addInitialNodeToCanvas('Manual Trigger');
			workflowPage.actions.executeWorkflow();

			executionsTab.actions.switchToExecutionsTab();
			executionsTab.actions.deleteExecutionInPreview();

			executionsTab.getters.successfulExecutionListItems().should('have.length', 0);
			successToast().contains('Execution deleted');
		});
	});

	it('should send proper payload for node rerun', () => {
		cy.createFixtureWorkflow('Multiple_trigger_node_rerun.json', 'Multiple trigger node rerun');

		workflowPage.getters.zoomToFitButton().click();
		workflowPage.getters.executeWorkflowButton().click();

		cy.intercept('POST', '/rest/workflows/**/run?**').as('workflowRun');

		workflowPage.getters
			.canvasNodeByName('Process The Data')
			.findChildByTestId('execute-node-button')
			.click({ force: true });

		cy.wait('@workflowRun').then((interception) => {
			expect(interception.request.body).to.have.property('runData').that.is.an('object');

			const expectedKeys = ['Start on Schedule', 'Edit Fields', 'Process The Data'];
			const { runData } = interception.request.body;

			expect(Object.keys(runData)).to.have.lengthOf(expectedKeys.length);
			expect(runData).to.include.all.keys(expectedKeys);
		});
	});

	it('should execute workflow partially up to the node that has issues', () => {
		cy.createFixtureWorkflow('Test_workflow_partial_execution_with_missing_credentials.json');

		cy.intercept('POST', '/rest/workflows/**/run?**').as('workflowRun');

		workflowPage.getters.zoomToFitButton().click();
		workflowPage.getters.executeWorkflowButton().click();

		cy.wait('@workflowRun');

		workflowPage.getters
			.canvasNodeByName('DebugHelper')
			.within(() => cy.get('svg[data-icon=node-success]'))
			.should('exist');

		workflowPage.getters
			.canvasNodeByName('Filter')
			.within(() => cy.get('svg[data-icon=node-success]'))
			.should('exist');

		errorToast().should('contain', 'Problem in node ‘Telegram‘');
	});
});
