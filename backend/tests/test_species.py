from app.species import get_schedule, list_species


def test_list_species_returns_all_ten():
    species = list_species()
    assert len(species) == 10
    assert all("scientific_name" in s for s in species)


def test_get_schedule_known_species():
    schedule = get_schedule("Lavandula angustifolia")
    assert schedule is not None
    assert schedule["common_name_nl"] == "Lavendel"
    assert schedule["pruning_month"] == "maart"


def test_get_schedule_is_case_insensitive():
    assert get_schedule("lavandula angustifolia") is not None


def test_get_schedule_unknown_species_returns_none():
    assert get_schedule("Triffidus celestis") is None
