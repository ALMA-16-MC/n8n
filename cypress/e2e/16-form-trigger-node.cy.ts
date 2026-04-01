import { WorkflowPage, NDV } from '../pages';
import { getVisibleSelect } from '../utils';

const workflowPage = new WorkflowPage();
const ndv = new NDV();

describe('n8n Form Trigger', () => {
	beforeEach(() => {
		workflowPage.actions.visit();
	});

	it("add node by clicking on 'On form submission'", () => {
		workflowPage.getters.canvasPlusButton().click();
		workflowPage.getters.nodeCreatorNodeItems().contains('On form submission').click();

		ndv.getters.parameterInput('formTitle').type('Test Form');
		ndv.getters.parameterInput('formDescription').type('Test Form Description');

		ndv.getters.backToCanvas().click();
		workflowPage.getters.nodeIssuesByName('On form submission').should('not.exist');
	});

	it('should fill up form fields', () => {
		workflowPage.actions.addInitialNodeToCanvas('On form submission', {
			isTrigger: true,
			action: 'On new n8n Form event',
		});

		ndv.getters.parameterInput('formTitle').type('Test Form');
		ndv.getters.parameterInput('formDescription').type('Test Form Description');

		// Add first field
		cy.get('[data-test-id="fixed-collection-add"]').click();
		ndv.getters.parameterInput('fieldLabel').type('Test Field 1');
		ndv.getters.parameterInput('fieldType').click();
		getVisibleSelect().contains('Number').click();

		cy.get(
			'[data-test-id="parameter-input-requiredField"] .el-switch__core',
		).click();

		// Add second field (Text)
		cy.contains('button', 'Add Field').click();
		cy.get('input[placeholder*="What is your name?"]').eq(0).type('Test Field 2');

		// Add third field (Date)
		cy.contains('button', 'Add Field').click();
		cy.get('input[placeholder*="What is your name?"]').eq(1).type('Test Field 3');

		cy.get('[data-test-id="parameter-input-fieldType"]').eq(1).click();
		getVisibleSelect().contains('Date').click();

		// Add fourth field (Dropdown)
		cy.contains('button', 'Add Field').click();
		cy.get('input[placeholder*="What is your name?"]').eq(2).type('Test Field 4');

		cy.get('[data-test-id="parameter-input-fieldType"]').eq(2).click();
		getVisibleSelect().contains('Dropdown').click();

		cy.contains('button', 'Add Field Option').click();

		cy.get('[data-test-id="parameter-input-field"]').eq(0).type('Option 1');
		cy.get('[data-test-id="parameter-input-field"]').eq(1).type('Option 2');

		// Add optional response message
		cy.get('.param-options').click();
		getVisibleSelect().contains('Form Response').click();

		cy.contains('span', 'Text to Show')
			.parent()
			.parent()
			.next()
			.find('input, textarea')
			.first()
			.type('Your test form was successfully submitted');

		ndv.getters.backToCanvas().click();
		workflowPage.getters.nodeIssuesByName('On form submission').should('not.exist');
	});
});
