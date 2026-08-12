










AUI.add(
	'portal-available-languages',
	function(A) {
		var available = {};

		var direction = {};

		

			available['ca_ES'] = 'catalán (España)';
			direction['ca_ES'] = 'ltr';

		

			available['zh_CN'] = 'chino (China)';
			direction['zh_CN'] = 'ltr';

		

			available['en_US'] = 'inglés (Estados Unidos)';
			direction['en_US'] = 'ltr';

		

			available['fi_FI'] = 'finés (Finlandia)';
			direction['fi_FI'] = 'ltr';

		

			available['fr_FR'] = 'francés (Francia)';
			direction['fr_FR'] = 'ltr';

		

			available['de_DE'] = 'alemán (Alemania)';
			direction['de_DE'] = 'ltr';

		

			available['iw_IL'] = 'hebreo (Israel)';
			direction['iw_IL'] = 'rtl';

		

			available['hu_HU'] = 'húngaro (Hungría)';
			direction['hu_HU'] = 'ltr';

		

			available['ja_JP'] = 'japonés (Japón)';
			direction['ja_JP'] = 'ltr';

		

			available['pt_BR'] = 'portugués (Brasil)';
			direction['pt_BR'] = 'ltr';

		

			available['es_ES'] = 'español (España)';
			direction['es_ES'] = 'ltr';

		

		Liferay.Language.available = available;
		Liferay.Language.direction = direction;
	},
	'',
	{
		requires: ['liferay-language']
	}
);